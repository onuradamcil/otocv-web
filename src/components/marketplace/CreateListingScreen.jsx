// =========================================================================
// OTO-CV İLAN VERME EKRANI KÖPRÜSÜ (CreateListingScreen.jsx)
// İşlev: Eski import yollarını bozmadan yeni Sihirbazı (CreateListingWizard) çağırır.
// =========================================================================

'use client';

import React from 'react';
import CreateListingWizard from './create-listing/CreateListingWizard';

export default function CreateListingScreen(props) {
  return <CreateListingWizard {...props} />;
}