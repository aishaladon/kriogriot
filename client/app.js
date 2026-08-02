const state = {
  chatHistory:        [],
  currentResearch:    '',
  parsedFindings:     [],
  currentMetadata:    null,
  currentImageB64:    null,
  currentImageType:   null,
  bulkQueue:          [],
  bulkResults:        [],
  previousPage:       'dashboard',
  ancestorCache:      {},
  selectedCategories: [], // empty = all
  selectedLocations:  [], // location filter for research
  researchName:       '',  // last ancestor name researched (for research log)
  // Modal state
  modalTable:         null,
  modalRecordId:      null,
  modalFields:        [],
};
