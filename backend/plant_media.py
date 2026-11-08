"""Validated local illustrations. Artwork is presentation, never ecological evidence."""
from pathlib import Path
import hashlib
from typing import Literal
from PIL import Image
from pydantic import BaseModel, ConfigDict, Field


class ImageFile(BaseModel):
    model_config = ConfigDict(extra="forbid")
    path: str
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    mime: Literal["image/png", "image/webp"]


class PlantImage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(pattern=r"^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$")
    topic_id: str
    role: Literal["whole", "detail"]
    alt: str = Field(min_length=1)
    caption: str = Field(min_length=1)
    provenance: dict
    references: list[dict]
    files: dict[Literal["original", "preview", "thumbnail"], ImageFile]


def managed_path(root: Path, relative: str, directory="media/plants") -> Path:
    path = (root / relative).resolve()
    allowed = (root / directory).resolve()
    if not path.is_relative_to(allowed) or path == allowed:
        raise ValueError(f"Media path must stay inside {directory}: {relative}")
    return path


def validate_image(root: Path, record: PlantImage):
    expected = {"original", "preview", "thumbnail"} if record.role == "whole" else {"original", "preview"}
    if set(record.files) != expected:
        raise ValueError(f"Incomplete image variants: {record.id}")
    if not record.provenance.get("tool") or not record.provenance.get("source_asset"):
        raise ValueError(f"Missing image provenance: {record.id}")
    for variant, spec in record.files.items():
        path = managed_path(root, spec.path)
        if not path.is_file():
            raise ValueError(f"Image file missing: {record.id}/{variant}: {spec.path}")
        if hashlib.sha256(path.read_bytes()).hexdigest() != spec.sha256:
            raise ValueError(f"Image checksum mismatch: {record.id}/{variant}")
        with Image.open(path) as im:
            im.load()
            expected_format = "PNG" if spec.mime == "image/png" else "WEBP"
            if im.size != (spec.width, spec.height) or im.format != expected_format or "A" not in im.getbands():
                raise ValueError(f"Invalid image dimensions/format/alpha: {record.id}/{variant}")


def public_image(record: dict) -> dict:
    return {k: record[k] for k in ("id", "topic_id", "role", "alt", "caption", "provenance", "references")} | {
        "variants": {v: {k: f[k] for k in ("sha256", "width", "height", "mime")} | {
            "url": f"/api/plant-images/{record['id']}/{v}"} for v, f in record["files"].items()}}


def enrich_topics(topics: list[dict], images: list[dict], resolve):
    by_topic = {}
    for image in images:
        by_topic.setdefault(resolve(image["topic_id"]), []).append(public_image(image))
    return [dict(t, plant_images=by_topic.get(t["id"], [])) if t["kind"] == "species" else t for t in topics]
