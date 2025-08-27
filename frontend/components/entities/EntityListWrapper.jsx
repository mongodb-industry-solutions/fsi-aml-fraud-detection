"use client";

import EntityList from "./EntityList";

export default function EntityListWrapper() {
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      <EntityList />
    </div>
  );
}