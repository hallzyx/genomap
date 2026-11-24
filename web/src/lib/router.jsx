import React, { useEffect, useState } from "react";

const EVENT = "gm-navigate";

export function navigate(to, { replace = false } = {}) {
  history[replace ? "replaceState" : "pushState"](null, "", to);
  window.dispatchEvent(new Event(EVENT));
  window.scrollTo(0, 0);
}

/** The current path, re-read whenever the user navigates. */
export function usePath() {
  const read = () => location.pathname.replace(/\/+$/, "") || "/";
  const [path, setPath] = useState(read);
  useEffect(() => {
    const update = () => setPath(read());
    window.addEventListener("popstate", update);
    window.addEventListener(EVENT, update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener(EVENT, update);
    };
  }, []);
  return path;
}

export function Link({ to, children, onClick, ...rest }) {
  return <a href={to} {...rest} onClick={(event) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    navigate(to);
  }}>{children}</a>;
}
