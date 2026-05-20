# Hetzner Mail (Stalwart) — buckmountain.farm setup

## What's done

### DNS (GoDaddy, propagated to public resolvers 2026-05-20)
| Type | Name | Value | Purpose |
|---|---|---|---|
| A | @ | 76.76.21.21 | Vercel app at apex |
| CNAME | www | cname.vercel-dns.com. | Vercel app at www |
| MX | @ | mail.oglife.app (priority 10) | Inbound mail → Stalwart on Hetzner |
| TXT | @ | `v=spf1 a:mail.oglife.app mx ~all` | SPF — softfail anything not from MX |
| TXT | _dmarc | (GoDaddy default, points at onsecureserver.net rua) | DMARC quarantine policy |
| NS | @ | ns73/ns74.domaincontrol.com | GoDaddy nameservers (untouched) |

### Vercel
- Custom domain `buckmountain.farm` added to project `buckmountain-farm` on team `mustwemuse-2641s-projects`
- Vercel reports `misconfigured: false` — DNS validates ✓
- TLS cert: Vercel auto-provisions Let's Encrypt cert once first prod hit lands
- **Deployment Protection: ON** — public visits to buckmountain.farm hit Vercel auth wall (= safe; no public exposure)

### Stalwart server (`mail.oglife.app` = 65.109.130.218)
- Stalwart v0.16.5 running as systemd unit `stalwart.service`
- Listening on 25, 465, 587, 993, 995, 4190, 443, 8080
- Custom Python RCPT filter on port 587 enforces SES bounce-suppression list
- Config store: RocksDB at `/opt/stalwart/data`
- Existing managed domains (oglife.app, etc.) configured via web admin (port 443 / 8080)

## What's left for buckmountain.farm to send + receive

These steps need Brendon's Stalwart admin login (browser, port 443 or 8080). Probably ~5 min total.

### 1. Add buckmountain.farm as a managed domain in Stalwart

In the Stalwart web admin (`https://mail.oglife.app/` after login):

- Settings → Domains → Add Domain
- Domain name: `buckmountain.farm`
- Enable DKIM signing (Ed25519 preferred; RSA 2048 if you need wider compat)

Stalwart will generate the DKIM keypair and surface the public key + selector. Common selector: `stalwart` or whatever Stalwart picks — write it down.

### 2. Add the DKIM TXT record at GoDaddy

Once Stalwart shows the public key:

```
Type:  TXT
Name:  <selector>._domainkey
Value: v=DKIM1; k=ed25519; p=<base64-public-key>     (Ed25519)
       — or —
       v=DKIM1; k=rsa; p=<base64-public-key>          (RSA)
TTL:   1 hour
```

If the public key exceeds 255 chars (RSA-2048 will), GoDaddy will split it. Paste the whole thing; it'll chunk automatically.

### 3. Create at least one mailbox for buckmountain.farm

Stalwart admin → Accounts → New Account:
- Email: `postmaster@buckmountain.farm` (RFC-required)
- And whatever else you want: `info@`, `randy@`, `brendon@`, etc.
- Forward rules: probably forward all to `oglife.hq@gmail.com` (per existing pattern from project memory)

### 4. Tighten DMARC (optional but recommended)

Edit the existing TXT _dmarc record at GoDaddy to point reports at buckmountain.farm:

```
Type:  TXT
Name:  _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:postmaster@buckmountain.farm; ruf=mailto:postmaster@buckmountain.farm; fo=1; aspf=r; adkim=r
TTL:   1 hour
```

(Currently points at GoDaddy's `dmarc_rua@onsecureserver.net` aggregator — fine to leave, just less visibility.)

### 5. Verify

```bash
# Inbound — does the MX resolve?
dig +short MX buckmountain.farm
# → 10 mail.oglife.app.

# SPF
dig +short TXT buckmountain.farm | grep spf1
# → "v=spf1 a:mail.oglife.app mx ~all"

# DKIM (after step 2)
dig +short TXT stalwart._domainkey.buckmountain.farm
# → "v=DKIM1; k=ed25519; p=..."

# DMARC
dig +short TXT _dmarc.buckmountain.farm

# Send a test email FROM stalwart for buckmountain.farm
swaks --to postmaster@buckmountain.farm --from test@buckmountain.farm --server mail.oglife.app
```

Or use https://www.mail-tester.com/ — send a test email, see the full SPF/DKIM/DMARC score.

## Quirks / decisions in this setup

- **Why MX 10 mail.oglife.app and not mx.buckmountain.farm?** One Hetzner server, multi-domain. Reusing the existing hostname avoids needing PTR/forward DNS for a buckmountain.farm-specific hostname.
- **Why softfail (`~all`) SPF and not strict (`-all`)?** Softfail lets receivers spam-folder rather than reject. Tighten to `-all` after a week of clean delivery + DMARC reports show no surprise senders.
- **Why no MTA-STS / TLS-RPT yet?** Optional; Stalwart can publish them but it's a hardening step, not a blocker. Add later.
- **DKIM key rotation:** plan to rotate annually. Stalwart can run dual selectors during rotation.

## Connecting it to the Vercel side

Once mailboxes exist, the contact form on buckmountain.farm (TODO P1.5) should POST to `postmaster@buckmountain.farm` via Stalwart's SMTP submission (port 587, AUTH PLAIN). Store SMTP creds in Vercel env:

```
SMTP_HOST=mail.oglife.app
SMTP_PORT=587
SMTP_USER=postmaster@buckmountain.farm
SMTP_PASS=<from Stalwart admin>
SMTP_FROM=noreply@buckmountain.farm
```
