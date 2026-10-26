#!/usr/bin/env python3
"""Create small local WebP references from already-downloaded source photographs.
Requires Pillow. Input files are named <asset-key>.image in --input-dir.
No network requests, crop, retouching, or content replacement are performed.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps


def prepare(manifest_path, root, input_dir):
    data = json.loads(manifest_path.read_text())
    root = root.resolve()
    for key, asset in data['assets'].items():
        source = input_dir / f'{key}.image'
        destination = (root / asset['photo']).resolve()
        if root not in destination.parents or destination.suffix != '.webp':
            raise ValueError(f'Invalid output path for {key}')
        with Image.open(source) as original:
            photo = ImageOps.exif_transpose(original)
            photo.thumbnail((600, 600), Image.Resampling.LANCZOS)
            if photo.mode not in ('RGB', 'RGBA'):
                photo = photo.convert('RGBA' if 'transparency' in original.info else 'RGB')
            destination.parent.mkdir(parents=True, exist_ok=True)
            photo.save(destination, 'WEBP', quality=84, method=6)
            asset['width'], asset['height'] = photo.size
        asset['sourceSha256'] = hashlib.sha256(source.read_bytes()).hexdigest()
        asset['photoSha256'] = hashlib.sha256(destination.read_bytes()).hexdigest()
        asset['bytes'] = destination.stat().st_size
    manifest_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f"Prepared {len(data['assets'])} local photo references ({sum(a['bytes'] for a in data['assets'].values()):,} bytes).")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--input-dir', type=Path, required=True)
    args = parser.parse_args()
    prepare(args.manifest, args.root, args.input_dir)
