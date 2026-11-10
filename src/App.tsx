//top-level screen router: keeps screens flat at src/ and isolates multi-file editor internals in src/wizard/
import React, { useEffect, useState } from "react";
import { Gallery } from "./Gallery.tsx";
import { loadGallery, type Entry, type Gallery as GalleryData } from "./store.ts";
import { Viewer } from "./Viewer.tsx";
import { Wizard } from "./wizard/Wizard.tsx";

//discriminated union of app screens; tracks returntoview and standalone so canceling an edit returns to where you started
export type Route =
  | { screen: "gallery"; gallery: GalleryData }
  | { screen: "view"; entry: Entry; standalone?: boolean }
  | { screen: "wizard"; entry?: Entry; returnToView?: boolean; standalone?: boolean };

const EMPTY_GALLERY: GalleryData = { entries: [], errors: [] };

//root state machine switching between gallery, viewer, and wizard screens
export default function App({ initial }: { initial?: Route }) {
  const [route, setRoute] = useState<Route>(() => initial ?? { screen: "gallery", gallery: EMPTY_GALLERY });

  //asynchronously reload portfolios from disk whenever entering the gallery screen so newly saved files appear immediately
  const toGallery = async () => {
    const gallery = await loadGallery();
    setRoute({ screen: "gallery", gallery });
  };

  useEffect(() => {
    if (!initial) void toGallery();
  }, [initial]);

  switch (route.screen) {
    case "gallery":
      return (
        <Gallery
          gallery={route.gallery}
          onView={(entry) => setRoute({ screen: "view", entry })}
          onEdit={(entry) => setRoute({ screen: "wizard", entry })}
          onCreate={() => setRoute({ screen: "wizard" })}
        />
      );
    case "view":
      return (
        <Viewer
          key={route.entry.file}
          data={route.entry.data}
          onEdit={() => setRoute({ screen: "wizard", entry: route.entry, returnToView: true, standalone: route.standalone })}
          onBack={route.standalone ? undefined : () => void toGallery()}
        />
      );
    case "wizard":
      return (
        <Wizard
          entry={route.entry}
          onView={(saved) => setRoute({ screen: "view", entry: saved, standalone: route.standalone })}
          onClose={() =>
            route.returnToView && route.entry
              ? setRoute({ screen: "view", entry: route.entry, standalone: route.standalone })
              : void toGallery()
          }
        />
      );
  }
}
