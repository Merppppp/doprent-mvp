export type SearchableItem = {
  value: string;
  label: string;
  /** Extra text (th + en labels) matched against the search query. */
  searchText: string;
};

export const VISIBLE_COUNT = 6;
