#!/usr/bin/env python3
from pyspark.sql import SparkSession
import os
import cv2
from PIL import Image
import numpy as np


# === Configuration (modifiable) ===
INPUT_DIR = '../dataset/'
OUTPUT_DIR = '../dataset_prepro/'
PARTITIONS = 4
MAX_FILES = 0  # 0 = tous

# === Initialisation Spark en local ===
spark = SparkSession.builder.master('local[*]').appName('PreprocessFaces').getOrCreate()
sc = spark.sparkContext

# === Fonctions de prétraitement ===
def gather_image_files(input_dir, exts=('.png')):
	files = []
	for root, _, filenames in os.walk(input_dir):
		for f in filenames:
			if f.lower().endswith(exts):
				files.append(os.path.join(root, f))
	return files


def load(path):
	# lit l'image et renvoie un dict minimal
	img = cv2.imread(path)
	if img is None:
		return None
	return {'path': path, 'img': img}



def preprocess(item):
	"""Convertit en RGBA, rogner la transparence, redimensionne en conservant le ratio
	et remplit avec de la transparence pour obtenir exactement 64x64. Sauvegarde en PNG
	dans `OUTPUT_DIR` et retourne un dict contenant `out_path`.
	"""
	src_path = item['path']
	try:
		with Image.open(src_path) as img:
			img_rgba = img.convert('RGBA')

			# trim transparent
			alpha = img_rgba.getchannel('A')
			bbox = alpha.getbbox()
			if bbox:
				trimmed = img_rgba.crop(bbox)
			else:
				trimmed = img_rgba

			# resize preserving aspect ratio and pad to 64x64
			target = (64, 64)
			trimmed.thumbnail(target, Image.LANCZOS)
			out_img = Image.new('RGBA', target, (0, 0, 0, 0))
			x = (target[0] - trimmed.width) // 2
			y = (target[1] - trimmed.height) // 2
			out_img.paste(trimmed, (x, y), trimmed)

			# save as PNG to preserve transparency
			out_dir = OUTPUT_DIR
			os.makedirs(out_dir, exist_ok=True)
			base = os.path.splitext(os.path.basename(src_path))[0]
			out_path = os.path.join(out_dir, base + '.png')
			out_img.save(out_path, 'PNG')

			return {'path': src_path, 'out_path': out_path}
	except Exception as e:
		print(f"ERREUR lors du traitement de {src_path}: {e}")
		return None


def finalize(item):
	# sauvegarde l'image traitée et retourne le chemin
	# Si preprocess a déjà sauvegardé l'image, on retourne simplement le chemin
	if isinstance(item, dict) and 'out_path' in item:
		return item['out_path']

	# Ancien comportement (au cas où on reçoit une dict avec 'img' numpy)
	out_dir = OUTPUT_DIR
	os.makedirs(out_dir, exist_ok=True)
	out_name = os.path.basename(item['path'])
	out_path = os.path.join(out_dir, out_name)
	if 'img' in item and item['img'] is not None:
		cv2.imwrite(out_path, item['img'])
		return out_path

	return None


# === Pipeline Spark ===
files = gather_image_files(INPUT_DIR)
if MAX_FILES and MAX_FILES > 0:
	files = files[:MAX_FILES]

data = sc.parallelize(files, PARTITIONS)
result = data.map(load).filter(lambda x: x is not None).map(preprocess).filter(lambda x: x is not None).map(finalize).collect()

print(f"Processed {len(result)} images, saved to {OUTPUT_DIR}")

spark.stop()

