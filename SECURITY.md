# Security Policy

## Reporting a vulnerability

Please report vulnerabilities by email to security@mailvelope.com, not in a public issue. This address also takes reports for the Mailvelope key server ([keys.mailvelope.com](https://keys.mailvelope.com), [mailvelope/keyserver](https://github.com/mailvelope/keyserver)).

You can encrypt your report to our OpenPGP key `3559 08C8 E09B E36F 0F8E 7556 486B 0850 F559 B452`, available [on keys.mailvelope.com](https://keys.mailvelope.com/pks/lookup?op=get&search=0x355908C8E09BE36F0F8E7556486B0850F559B452).

Please include the Mailvelope version, the browser, the steps to reproduce and the impact you see. Please give us time to release a fix before you publish details.

## Supported versions

Security fixes go into the latest release on the Chrome Web Store, Firefox Add-ons, Microsoft Edge Add-ons and [GitHub releases](https://github.com/mailvelope/mailvelope/releases).

## Scope

[`.oss-scanner/threat_model.md`](.oss-scanner/threat_model.md) describes the attackers we defend against and how we rate severity. Vulnerabilities in [OpenPGP.js](https://github.com/openpgpjs/openpgpjs) itself go to that project. Past audits and fixed vulnerabilities are listed on the [Security wiki page](https://github.com/mailvelope/mailvelope/wiki/Security).
