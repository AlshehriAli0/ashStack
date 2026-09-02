declare const TrashIcon: () => JSX.Element;

export const Delete = () => (
  <button type="button" aria-label="Delete this row">
    <TrashIcon />
  </button>
);

export const Labelled = () => (
  <button type="button">
    <TrashIcon /> Delete
  </button>
);
