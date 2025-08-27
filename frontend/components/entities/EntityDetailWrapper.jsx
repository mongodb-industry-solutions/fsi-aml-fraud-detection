"use client";

import EntityDetail from "./EntityDetail";

export default function EntityDetailWrapper({ entityId }) {
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      <EntityDetail entityId={entityId} />
    </div>
  );
}