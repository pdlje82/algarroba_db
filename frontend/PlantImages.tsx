import React, { useEffect, useRef, useState } from "react";
import type { Item, PlantImage } from "./types";

export function retryPlantImages() {
  window.dispatchEvent(new Event("plant-images-retry"));
}

function ImagePanel({ image }: { image: PlantImage }) {
  const [original, setOriginal] = useState(false),
    [failed, setFailed] = useState(false),
    [attempt, setAttempt] = useState(0);
  const variant = image.variants[original ? "original" : "preview"];
  return (
    <figure className={"plant-image-panel" + (original ? " natural-size" : "")}>
      <figcaption>
        <strong>
          {image.role === "whole"
            ? "Representative whole plant"
            : "Botanical detail"}
        </strong>
      </figcaption>
      <div className="plant-image-scroll">
        {!variant ? (
          <p role="alert">This image variant is not registered.</p>
        ) : failed ? (
          <div role="alert">
            <p>Plant image unavailable.</p>
            <button
              onClick={() => {
                setFailed(false);
                setAttempt((x) => x + 1);
                retryPlantImages();
              }}
            >
              Retry image
            </button>
          </div>
        ) : (
          <img
            key={attempt + ":" + original}
            src={variant.url + (attempt ? "?retry=" + attempt : "")}
            alt={image.alt}
            width={variant.width}
            height={variant.height}
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <p>{image.caption}</p>
      <button
        onClick={() => {
          setOriginal(!original);
          setFailed(false);
        }}
      >
        {original ? "Fit view" : "Original size"}
      </button>
    </figure>
  );
}

function ImageViewer({ topic, close }: { topic: Item; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current!.showModal();
    return () => previous?.focus();
  }, []);
  const images = topic.plant_images || [];
  return (
    <dialog
      ref={dialog}
      className="plant-image-viewer"
      aria-label={"Plant images: " + topic.label}
      onClose={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) dialog.current!.close();
      }}
    >
      <header>
        <div>
          <h2>
            {topic.spanish_name} · {topic.english_name || topic.label}
          </h2>
          <em>{topic.scientific_name}</em>
        </div>
        <button autoFocus onClick={() => dialog.current!.close()}>
          Close images
        </button>
      </header>
      <p className="muted">
        AI-generated illustrations · representative forms · not to a common
        scale
      </p>
      <div className="plant-image-pair">
        {["whole", "detail"].map((role) => {
          const image = images.find((x) => x.role === role);
          return image ? (
            <ImagePanel key={image.id} image={image} />
          ) : (
            <p key={role} role="alert">
              The {role} image is not registered.
            </p>
          );
        })}
      </div>
      <details>
        <summary>Illustration provenance and botanical references</summary>
        {images.map((image) => (
          <section key={image.id}>
            <h3>{image.role === "whole" ? "Whole plant" : "Detail"}</h3>
            <p>
              Generated with {image.provenance.tool}
              {image.provenance.generated_on
                ? " · " + image.provenance.generated_on
                : ""}
              . Review recorded{" "}
              {image.provenance.reviewed_on || "without a verified date"}.
            </p>
            {image.references.map((ref) => (
              <p key={ref.url}>
                <a href={ref.url} target="_blank" rel="noreferrer">
                  {ref.label} ↗
                </a>
              </p>
            ))}
          </section>
        ))}
      </details>
    </dialog>
  );
}

export function PlantImages({ topic }: { topic: Item }) {
  const [open, setOpen] = useState(false),
    [failed, setFailed] = useState(false),
    [attempt, setAttempt] = useState(0);
  const images = topic.plant_images || [],
    whole = images.find((x) => x.role === "whole");
  if (!images.length) return null;
  const thumbnail = whole?.variants.thumbnail;
  return (
    <section className="plant-images" aria-label="Plant illustrations">
      {thumbnail && !failed ? (
        <button
          className="plant-preview"
          onClick={() => setOpen(true)}
          aria-label={"View plant images of " + topic.label}
        >
          <img
            src={thumbnail.url + (attempt ? "?retry=" + attempt : "")}
            alt={whole!.alt}
            width="112"
            height="112"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        </button>
      ) : (
        <p role="alert">Whole-plant image unavailable.</p>
      )}
      <div>
        <button onClick={() => setOpen(true)}>View plant images</button>
        <p>Whole plant and botanical detail</p>
        <small>AI-generated · not to scale</small>
        <br />
        <button
          className="small"
          onClick={() => {
            setFailed(false);
            setAttempt((x) => x + 1);
            retryPlantImages();
          }}
        >
          Retry plant images
        </button>
      </div>
      {open && <ImageViewer topic={topic} close={() => setOpen(false)} />}
    </section>
  );
}
