#!/usr/bin/env python3
"""Validate a photo/SVG manifest without network access or third-party packages."""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlparse
import xml.etree.ElementTree as ET


def validate(manifest_path, root):
    data = json.loads(manifest_path.read_text())
    root = root.resolve()

    def local(value):
        path = (root / value).resolve()
        if root not in path.parents:
            raise ValueError(f'Asset escapes the site directory: {value}')
        if not path.is_file():
            raise ValueError(f'Missing asset: {value}')
        return path

    for key, asset in data['assets'].items():
        for field in ('sourcePage', 'sourceImage'):
            url = urlparse(asset[field])
            if url.scheme != 'https' or not url.netloc:
                raise ValueError(f'{key}: source must be an absolute HTTPS URL')
        for field in ('credit', 'checkedOn', 'rights', 'sourceSha256', 'photoSha256'):
            if not asset.get(field):
                raise ValueError(f'{key}: missing {field}')
        photo = local(asset['photo']).read_bytes()
        if hashlib.sha256(photo).hexdigest() != asset['photoSha256']:
            raise ValueError(f'{key}: local photo checksum differs')
        if not (photo.startswith(b'RIFF') and photo[8:12] == b'WEBP'):
            raise ValueError(f'{key}: expected a real WebP image')

    forbidden = {'script', 'foreignObject', 'image', 'iframe', 'animate', 'set'}
    for component_id, component in data['components'].items():
        if component['asset'] not in data['assets']:
            raise ValueError(f'{component_id}: unknown source asset')
        if component['scope'] not in ('listing', 'reference', 'material'):
            raise ValueError(f'{component_id}: unclear image scope')
        if not component['observations'] or not component['note']:
            raise ValueError(f'{component_id}: missing visual evidence or limitations')
        text = local(component['svg']).read_text()
        if '<!DOCTYPE' in text.upper() or '<!ENTITY' in text.upper():
            raise ValueError(f'{component_id}: SVG document declarations are unnecessary')
        svg = ET.fromstring(text)
        if svg.tag.rsplit('}', 1)[-1] != 'svg' or not svg.get('viewBox'):
            raise ValueError(f'{component_id}: SVG needs a viewBox')
        tags = {node.tag.rsplit('}', 1)[-1] for node in svg.iter()}
        if not {'title', 'desc'} <= tags or tags & forbidden:
            raise ValueError(f'{component_id}: SVG accessibility or embedded content error')
        ids = [node.get('id') for node in svg.iter() if node.get('id')]
        if len(ids) != len(set(ids)):
            raise ValueError(f'{component_id}: duplicate SVG ID')
        for node in svg.iter():
            for attr, value in node.attrib.items():
                name = attr.rsplit('}', 1)[-1]
                if name.lower().startswith('on'):
                    raise ValueError(f'{component_id}: executable event attribute')
                if name in ('href', 'src') and not value.startswith('#'):
                    raise ValueError(f'{component_id}: external or embedded reference')
                if 'url(' in value and 'url(#' not in value:
                    raise ValueError(f'{component_id}: nonlocal paint reference')
    print(f"Validated {len(data['assets'])} local photos and {len(data['components'])} accessible, self-contained SVGs.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--root', type=Path, required=True)
    args = parser.parse_args()
    validate(args.manifest, args.root)
