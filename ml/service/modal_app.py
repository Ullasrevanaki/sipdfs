from pathlib import Path

import modal


# ============================================================
# MODAL APP
# ============================================================

app = modal.App("sipdfs-api")


# ============================================================
# PATHS
# ============================================================

ML_DIR = Path(__file__).resolve().parent.parent


# ============================================================
# CLOUD IMAGE
# ============================================================

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "fastapi",
        "uvicorn[standard]",
        "xgboost",
        "scikit-learn",
        "pandas",
        "numpy",
        "pydantic",
    )
    .add_local_dir(
        ML_DIR,
        remote_path="/root/ml",
    )
)


# ============================================================
# FASTAPI
# ============================================================

@app.function(
    image=image,
    timeout=300,
)
@modal.asgi_app()
def fastapi_app():

    import sys

    if "/root" not in sys.path:
        sys.path.insert(0, "/root")

    from ml.service.main import app as fastapi_application

    return fastapi_application