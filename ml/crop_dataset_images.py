#!/usr/bin/env python3
"""Crop, resize and pad images from a dataset folder.

Workflow per image:
- Convert to RGBA
- Trim transparent pixels to the minimal bounding box
- Resize to fit within 64x64 preserving aspect ratio
- Pad with transparent pixels to make exactly 64x64

Places transformed images in an output folder mirroring input structure.
Supports --dry-run to only print planned actions.
"""
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Tuple

from PIL import Image
from tqdm import tqdm


def trim_transparent(img: Image.Image) -> Image.Image:
    """Trim transparent borders from an RGBA image.
    
    Assumes img is in RGBA mode.
    """
    # Obtenir le canal alpha
    alpha = img.getchannel("A")
    
    # Obtenir la bounding box des pixels non-transparents (non-zéro)
    bbox = alpha.getbbox()
    
    if bbox:
        return img.crop(bbox)
    return img  # Retourne l'original si l'image est vide ou déjà rognée


def resize_and_pad(img: Image.Image, size: Tuple[int, int] = (64, 64)) -> Image.Image:
    """Resize image preserving aspect ratio and pad with transparency to target size."""
    target_w, target_h = size
    # thumbnail modifie l'image en place pour s'adapter à la taille, en gardant le ratio
    img.thumbnail((target_w, target_h), Image.LANCZOS)
    
    # Crée un fond transparent (RGBA avec 0 pour l'alpha)
    out = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    
    # Calcule la position centrée
    x = (target_w - img.width) // 2
    y = (target_h - img.height) // 2
    
    # Colle l'image redimensionnée (le canal alpha de 'img' est utilisé comme masque)
    out.paste(img, (x, y))
    return out


def process_file(src_path: Path, dst_path: Path, dry_run: bool = False) -> None:
    """Traite une seule image : convertit RGBA, trim, resize, pad."""
    try:
        with Image.open(src_path) as img:
            # 1. Convertir en RGBA immédiatement pour standardiser le pipeline
            img_rgba = img.convert("RGBA")
            
            # 2. Rogner la transparence
            trimmed = trim_transparent(img_rgba)
            
            # 3. Redimensionner et combler avec de la transparence
            final = resize_and_pad(trimmed, (64, 64))
            
            if not dry_run:
                dst_path.parent.mkdir(parents=True, exist_ok=True)
                # Sauvegarde en PNG pour préserver la transparence
                final.save(dst_path, "PNG") 
    except Exception as e:
        tqdm.write(f"ERREUR lors du traitement de {src_path}: {e}")


def is_image_file(p: Path) -> bool:
    """Vérifie si le fichier est une image basée sur l'extension."""
    return p.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Recadre (transparence), redimensionne et comble (transparence) les images à 64x64")
    parser.add_argument("--input-dir", "-i", type=Path, default=Path("dataset"), help="Dossier d'entrée du dataset")
    parser.add_argument("--output-dir", "-o", type=Path, default=Path("dataset_transformed"), help="Dossier de sortie")
    parser.add_argument("--dry-run", action="store_true", help="N'écrit pas de fichiers, affiche seulement les actions prévues")
    parser.add_argument("--max-files", type=int, default=None, help="Nombre maximum d'images à traiter (défaut: toutes)")
    args = parser.parse_args()

    src_root = args.input_dir
    dst_root = args.output_dir

    if not src_root.exists():
        print(f"Le dossier d'entrée {src_root} n'existe pas.")
        return

    # Trouve tous les fichiers image récursivement
    image_files = [p for p in src_root.rglob("*") if p.is_file() and is_image_file(p)]
    
    if not image_files:
        print(f"Aucun fichier image trouvé dans {src_root}")
        return

    total_found = len(image_files)

    print_limit = ""
    if args.max_files is not None and args.max_files > 0:
        image_files = image_files[:args.max_files]
        print_limit = f" (traitement des {len(image_files)} premiers)"

    print(f"Trouvé {total_found} image(s) dans {src_root}{print_limit}. Dry run={args.dry_run}")

    # Boucle avec tqdm
    for src in tqdm(image_files, desc="Traitement des images", unit="img"):
        rel = src.relative_to(src_root)
        dst = dst_root / rel
        # S'assure que la sortie est .png pour garder la transparence
        dst = dst.with_suffix(".png")
        
        # --- Appel de process_file mis à jour (sans tol) ---
        process_file(src, dst, dry_run=args.dry_run)

    print("Traitement terminé.")


if __name__ == "__main__":
    main()