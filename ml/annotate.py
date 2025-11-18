import pandas as pd
from pathlib import Path
import argparse
import sqlite3
from tqdm import tqdm

# --- PARAMÈTRES (maintenant gérés par argparse) ---
DOSSIER_DEFAULT = Path("./dataset")
OUTPUT_DIR_DEFAULT = Path("./dataset")
OUTPUT_BASENAME_DEFAULT = "csv_global"
# -------------------------------------------------

ATTRIBUTS = ["facial_hair", "glasses", "hair", "hair_color"]

# ---------- MAPPINGS ----------
# (Toutes vos fonctions de mapping restent identiques)

# facial_hair
FACIAL_HAIR_BARBE = {0, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13}
FACIAL_HAIR_MOUSTACHE = {0, 2, 3, 5, 6, 7, 8, 9, 10, 11}

def map_barbe(v):
    """1 si barbe, 0 sinon"""
    if pd.isna(v):
        return pd.NA
    v = int(v)
    return 1 if v in FACIAL_HAIR_BARBE else 0

def map_moustache(v):
    """1 si moustache, 0 sinon"""
    if pd.isna(v):
        return pd.NA
    v = int(v)
    return 1 if v in FACIAL_HAIR_MOUSTACHE else 0


# glasses
GLASSES_NO = {11}
GLASSES_YES = set(range(0, 11))  # 0..10

def map_glasses_bool(v):
    """1 si lunettes, 0 sinon"""
    if pd.isna(v):
        return pd.NA
    v = int(v)
    if v in GLASSES_YES:
        return 1
    if v in GLASSES_NO:
        return 0
    return pd.NA


# hair
HAIR_BALD = {0, 1, 2, 108, 109, 110}
HAIR_SHORT = {
    8, 11, 12, 14, 17, 18, 19, 20, 21, 22, 23,
    31, 32, 39, 43, 44, 45, 46, 49, 50, 51, 52, 53, 54,
    61, 62, 66, 72, 73, 74, 76, 77, 83, 89, 92, 99, 105, 107
}
HAIR_LONG = {
    3, 4, 5, 6, 7, 9, 10, 13, 15, 16,
    24, 25, 26, 27, 28, 29, 30,
    33, 34, 35, 36, 37, 38,
    40, 41, 42, 47, 48,
    55, 56, 57, 58, 59, 60,
    63, 64, 65, 67, 68, 69, 70, 71,
    75, 78, 79, 80, 81, 82,
    84, 85, 86, 87, 88, 90, 91,
    93, 94, 95, 96, 97, 98,
    100, 101, 102, 103, 104, 106
}

ALL_HAIR = HAIR_BALD | HAIR_SHORT | HAIR_LONG

def map_hair_long(v):
    if pd.isna(v):
        return pd.NA
    v = int(v)
    if v in HAIR_LONG:
        return 1
    if v in ALL_HAIR:
        return 0
    return pd.NA

def map_hair_short(v):
    if pd.isna(v):
        return pd.NA
    v = int(v)
    if v in HAIR_SHORT:
        return 1
    if v in ALL_HAIR:
        return 0
    return pd.NA

def map_hair_bald(v):
    if pd.isna(v):
        return pd.NA
    v = int(v)
    if v in HAIR_BALD:
        return 1
    if v in ALL_HAIR:
        return 0
    return pd.NA


# hair_color
HAIR_BLOND = {0, 1, 4}
HAIR_CHA = {3, 5, 6}
HAIR_RED = {2}
HAIR_BROWN = {7}
HAIR_GREY = {8, 9}

ALL_HAIR_COLOR = HAIR_BLOND | HAIR_CHA | HAIR_RED | HAIR_BROWN | HAIR_GREY

def map_blonds(v):
    if pd.isna(v):
        return pd.NA
    v = int(v)
    if v in HAIR_BLOND:
        return 1
    if v in ALL_HAIR_COLOR:
        return 0
    return pd.NA

def map_chatains(v):
    if pd.isna(v):
        return pd.NA
    v = int(v)
    if v in HAIR_CHA:
        return 1
    if v in ALL_HAIR_COLOR:
        return 0
    return pd.NA

def map_roux(v):
    if pd.isna(v):
        return pd.NA
    v = int(v)
    if v in HAIR_RED:
        return 1
    if v in ALL_HAIR_COLOR:
        return 0
    return pd.NA

def map_brun(v):
    if pd.isna(v):
        return pd.NA
    v = int(v)
    if v in HAIR_BROWN:
        return 1
    if v in ALL_HAIR_COLOR:
        return 0
    return pd.NA

def map_gris_bleu(v):
    if pd.isna(v):
        return pd.NA
    v = int(v)
    if v in HAIR_GREY:
        return 1
    if v in ALL_HAIR_COLOR:
        return 0
    return pd.NA


# ---------- CONSTRUCTION DU DATAFRAME GLOBAL ----------

def process_files(dossier: Path, csv_output_name: str) -> pd.DataFrame:
    """Traite les fichiers CSV du dossier et retourne un DataFrame global."""
    
    # --- Modifié pour tqdm ---
    # 1. On collecte les fichiers d'abord pour avoir le total
    files_to_process = [
        csv_path for csv_path in dossier.glob("*.csv")
        if csv_path.name != csv_output_name
    ]

    if not files_to_process:
        print("Aucun fichier CSV à traiter n'a été trouvé.")
        return pd.DataFrame()
    
    lignes = []

    # 2. On utilise tqdm sur la liste des fichiers
    print(f"Traitement de {len(files_to_process)} fichiers CSV...")
    for csv_path in tqdm(files_to_process, desc="🔄 Traitement des fichiers", unit="fichier"):
    # --- Fin de la modification tqdm ---

        # on force les colonnes C1, C2, C3 et on lit tout en str
        try:
            df = pd.read_csv(csv_path, header=None, names=["C1", "C2", "C3"], dtype=str)
        except pd.errors.EmptyDataError:
            # Gérer les fichiers vides qui peuvent causer une erreur à la lecture
            continue 

        if df.empty:
            continue

        # C2 -> numérique, tout ce qui n'est pas un chiffre devient NaN
        df["C2"] = pd.to_numeric(df["C2"], errors="coerce")

        # on récupère seulement les attributs voulus
        sous_df = df[df["C1"].isin(ATTRIBUTS)].set_index("C1")["C2"]

        ligne = {"filename": csv_path.name}

        # IDs (valeurs C2) brutes, utilisées juste pour les mappings
        facial_hair_id = sous_df.get("facial_hair", pd.NA)
        glasses_id = sous_df.get("glasses", pd.NA)
        hair_id = sous_df.get("hair", pd.NA)
        hair_color_id = sous_df.get("hair_color", pd.NA)

        # facial_hair -> colonnes booléennes
        ligne["barbe"] = map_barbe(facial_hair_id)      # 0/1
        ligne["moustache"] = map_moustache(facial_hair_id)  # 0/1

        # glasses -> booléen
        ligne["lunette"] = map_glasses_bool(glasses_id)     # 0/1

        # hair -> 3 colonnes
        ligne["long"] = map_hair_long(hair_id)          # 0/1
        ligne["court"] = map_hair_short(hair_id)        # 0/1
        ligne["chauve"] = map_hair_bald(hair_id)        # 0/1

        # hair_color -> 5 colonnes
        ligne["blonds"] = map_blonds(hair_color_id)     # 0/1
        ligne["chatains"] = map_chatains(hair_color_id) # 0/1
        ligne["roux"] = map_roux(hair_color_id)         # 0/1
        ligne["brun"] = map_brun(hair_color_id)         # 0/1
        ligne["gris_bleu"] = map_gris_bleu(hair_color_id)   # 0/1

        lignes.append(ligne)

    # La vérification "if not lignes:" est maintenant redondante 
    # car "if not files_to_process:" couvre ce cas plus tôt.
    
    global_df = pd.DataFrame(lignes)

    # On ne garde que filename + colonnes booléennes
    colonnes_finales = [
        "filename",
        "barbe", "moustache",
        "lunette",
        "long", "court", "chauve",
        "blonds", "chatains", "roux", "brun", "gris_bleu",
    ]
    # S'assurer que toutes les colonnes existent même si les données d'entrée étaient partielles
    for col in colonnes_finales:
        if col not in global_df.columns:
            global_df[col] = pd.NA
            
    global_df = global_df[colonnes_finales]
    
    return global_df


# --- POINT D'ENTRÉE DU SCRIPT ---

def main():
    """Fonction principale pour parser les arguments et lancer le traitement."""
    parser = argparse.ArgumentParser(
        description="Agréger des fichiers CSV d'attributs en un CSV global et/ou une base SQLite."
    )
    parser.add_argument(
        "-d", "--dossier",
        type=str,
        default=str(DOSSIER_DEFAULT),
        help=f"Dossier contenant les fichiers CSV à traiter. (Défaut: {DOSSIER_DEFAULT})"
    )
    parser.add_argument(
        "--format",
        type=str,
        choices=["csv", "sqlite"],
        default=None,
        help="Format de sortie : 'csv', 'sqlite', ou rien pour les deux. (Défaut: les deux)"
    )
    parser.add_argument(
        "-o", "--output",
        type=str,
        default=None,
        help=f"Chemin complet du fichier de sortie (avec ou sans extension). Si non spécifié, utilise {{output-dir}}/{{output-base-name}}.{{ext}}"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(OUTPUT_DIR_DEFAULT),
        help=f"Dossier de sortie pour les fichiers générés. (Défaut: {OUTPUT_DIR_DEFAULT})"
    )
    parser.add_argument(
        "--output-base-name",
        type=str,
        default=OUTPUT_BASENAME_DEFAULT,
        help=f"Nom de base pour les fichiers de sortie (sans extension). (Défaut: {OUTPUT_BASENAME_DEFAULT})"
    )
    args = parser.parse_args()

    # Gestion des chemins
    DOSSIER = Path(args.dossier).resolve()
    OUTPUT_DIR = Path(args.output_dir).resolve()
    BASE_NAME = args.output_base_name
    
    # Créer le dossier de sortie s'il n'existe pas
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Déterminer les chemins de sortie
    if args.output:
        # Chemin personnalisé fourni
        output_path = Path(args.output).resolve()
        output_base = output_path.stem
        output_dir = output_path.parent
        FICHIER_SORTIE_CSV = output_dir / f"{output_base}.csv"
        FICHIER_SORTIE_SQLITE = output_dir / f"{output_base}.db"
    else:
        # Utiliser output-dir et output-base-name
        FICHIER_SORTIE_CSV = OUTPUT_DIR / f"{BASE_NAME}.csv"
        FICHIER_SORTIE_SQLITE = OUTPUT_DIR / f"{BASE_NAME}.db"
    
    # Déterminer les formats à sauvegarder
    save_csv = args.format in [None, "csv"]
    save_sqlite = args.format in [None, "sqlite"]

    # --- Traitement ---
    print(f"Recherche des fichiers dans : {DOSSIER}")
    global_df = process_files(DOSSIER, FICHIER_SORTIE_CSV.name)

    if global_df.empty:
        print("DataFrame global est vide. Aucune sauvegarde effectuée.")
        return

    # --- Sauvegarde ---
    saved_csv = False
    if save_csv:
        try:
            FICHIER_SORTIE_CSV.parent.mkdir(parents=True, exist_ok=True)
            global_df.to_csv(FICHIER_SORTIE_CSV, index=False)
            print(f"✅ CSV global créé : {FICHIER_SORTIE_CSV}")
            saved_csv = True
        except Exception as e:
            print(f"❌ Erreur lors de la sauvegarde CSV : {e}")

    saved_sqlite = False
    if save_sqlite:
        try:
            FICHIER_SORTIE_SQLITE.parent.mkdir(parents=True, exist_ok=True)
            conn = sqlite3.connect(str(FICHIER_SORTIE_SQLITE))
            # Utiliser le nom de base comme nom de table, en s'assurant qu'il est valide
            table_name = "".join(c if c.isalnum() else "_" for c in BASE_NAME)
            if not table_name:
                table_name = "data"  # Fallback
            
            global_df.to_sql(table_name, conn, if_exists="replace", index=False)
            conn.close()
            print(f"✅ Base de données SQLite créée : {FICHIER_SORTIE_SQLITE} (table: {table_name})")
            saved_sqlite = True
        except Exception as e:
            print(f"❌ Erreur lors de la sauvegarde SQLite : {e}")

    if not saved_csv and not saved_sqlite:
        print("ℹ️  Aucune sauvegarde n'a été effectuée.")


if __name__ == "__main__":
    main()