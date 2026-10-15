#!/usr/bin/env python3
"""Render the EchoTake policies from their ten-locale source copy."""
import html
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'assets/echotake-policies.json').read_text())
assert len(data) == 10
# Static multilingual HTML: every translation remains available without scripts.
css='''body{font-family:system-ui,-apple-system,sans-serif;line-height:1.75;color:#1a2621;background:#f6f7f6;margin:0}main{max-width:820px;margin:auto;padding:40px 24px 64px}a{color:#175b49;overflow-wrap:anywhere}nav{display:flex;flex-wrap:wrap;gap:8px 18px;padding:16px 0;border-block:1px solid #ccd6d0}h1{font-size:2rem;line-height:1.25}h2{font-size:1.6rem;margin-top:56px}h3{font-size:1.1rem;margin-top:28px}p{overflow-wrap:anywhere}section{scroll-margin-top:20px;border-bottom:1px solid #ccd6d0;padding-bottom:32px}.updated{color:#4b5d54}footer{margin-top:32px}a:focus-visible{outline:3px solid #175b49;outline-offset:4px}@media(max-width:480px){main{padding:24px 18px 48px}h1{font-size:1.65rem}}'''
for kind,slug in [('privacy','privacy-policy'),('terms','terms-of-service')]:
 title=data['en'][kind+'Title'];other='terms' if kind=='privacy' else 'privacy';otherSlug='terms-of-service' if other=='terms' else 'privacy-policy'
 nav=''.join(f'<a href="#{locale}" lang="{locale}">{v["label"]}</a>' for locale,v in data.items())
 sections=[]
 for locale,v in data.items():
  paragraphs=''.join(f'<h3>{i}. {html.escape(h)}</h3><p>{html.escape(p)}</p>' for i,(h,p) in enumerate(v[kind],1))
  # Make URLs and the email actionable while preserving exact approved prose.
  import re
  paragraphs=re.sub(r'https://[^\s<>]+',lambda m:f'<a href="{m[0]}">{m[0]}</a>',paragraphs)
  paragraphs=paragraphs.replace('prizm_kr@hotmail.com','<a href="mailto:prizm_kr@hotmail.com">prizm_kr@hotmail.com</a>')
  sections.append(f'<section id="{locale}" lang="{locale}"><h2>{html.escape(v[kind+"Title"])} — {html.escape(v["label"])}</h2><p class="updated">{html.escape(v["updated"])}</p>{paragraphs}<p><a href="echotake-{otherSlug}.html#{locale}">{html.escape(v[other+"Title"])}</a> · <a href="#top">↑ EchoTake</a></p></section>')
 output=f'<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EchoTake — {title}</title><meta name="description" content="{title} for EchoTake by Prizm. Available in ten languages."><style>{css}</style></head><body><main id="top"><header><p>PRIZM · EchoTake</p><h1>{title}</h1><nav aria-label="Language">{nav}</nav></header>'+''.join(sections)+'<footer>EchoTake © 2026 Prizm · <a href="mailto:prizm_kr@hotmail.com">prizm_kr@hotmail.com</a></footer></main></body></html>\n'
 # CJK punctuation is not part of a URL; move it outside the generated anchors.
 output=re.sub(r'(<a href="[^\"]*?)([。；，]+)(">[^<]*?)(?:[。；，]+)(</a>)',r'\1\3\4\2',output)
 (root/f'echotake-{slug}.html').write_text(output)
