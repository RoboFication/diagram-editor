# server.py
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os, subprocess, time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:3000"] for stricter security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

PLANTUML_JAR_PATH = os.path.join(os.path.dirname(__file__), "plantuml.jar")
TEMP_PUML = os.path.join(os.path.dirname(__file__), "diagram.puml")
TEMP_PNG  = os.path.join(os.path.dirname(__file__), "diagram.png")

SAVE_DIR = os.path.join(os.path.dirname(__file__), "saved_diagrams")
os.makedirs(SAVE_DIR, exist_ok=True)

class UMLBody(BaseModel):
    uml: str

@app.post("/render")
def render(uml_body: UMLBody):
    uml_text = uml_body.uml.strip()
    if not uml_text:
        return Response(content="No UML text", status_code=400)

    with open(TEMP_PUML, "w", encoding="utf-8") as f:
        f.write(uml_text)

    try:
        proc = subprocess.run(
            ["java", "-jar", PLANTUML_JAR_PATH, TEMP_PUML],
            capture_output=True, text=True
        )
        if proc.returncode != 0:
            print("PlantUML Error:", proc.stderr)
            return Response(
                content=f"PlantUML error code {proc.returncode}",
                status_code=500
            )
    except Exception as e:
        print("Java spawn error:", e)
        return Response(content="Java spawn error", status_code=500)

    if not os.path.exists(TEMP_PNG):
        return Response(content="diagram.png not found", status_code=500)

    with open(TEMP_PNG, "rb") as f:
        png_data = f.read()
    return Response(content=png_data, media_type="image/png")

@app.post("/save")
def save(uml_body: UMLBody):
    uml_text = uml_body.uml.strip()
    if not uml_text:
        return Response(content="No UML text provided", status_code=400)

    timestamp = int(time.time())
    puml_file = os.path.join(SAVE_DIR, f"diagram_{timestamp}.puml")
    png_file  = os.path.join(SAVE_DIR, f"diagram_{timestamp}.png")

    with open(puml_file, "w", encoding="utf-8") as f:
        f.write(uml_text)

    try:
        proc = subprocess.run(
            ["java", "-jar", PLANTUML_JAR_PATH, puml_file],
            capture_output=True, text=True
        )
        if proc.returncode != 0:
            print("PlantUML Error (save):", proc.stderr)
            return Response(
                content=f"PlantUML error code {proc.returncode}",
                status_code=500
            )
    except Exception as e:
        print("Java spawn error (save):", e)
        return Response(content="Java spawn error (save)", status_code=500)

    default_png = os.path.join(SAVE_DIR, "diagram.png")
    if os.path.exists(default_png):
        os.rename(default_png, png_file)

    return {
        "message": "Saved successfully",
        "pumlPath": puml_file,
        "pngPath": png_file
    }
