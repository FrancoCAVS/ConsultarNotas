// This file is no longer used by the core DNI grade lookup functionality,
// which now queries Supabase directly via server actions.
// Keeping the file for now to avoid potential import errors if other parts of the
// application (not currently visible) might reference it.
// Consider removing this file if it's confirmed to be entirely obsolete.

export async function fetchStudentDataFromSheet(sheetUrl: string, dni: string): Promise<null> {
  console.warn(
    `[Mock AI Flow - DEPRECATED] fetchStudentDataFromSheet called with URL: ${sheetUrl} and DNI: ${dni}. This flow is deprecated and should not be used for primary grade lookup.`
  );
  // In a real scenario, this would attempt to fetch from the actual Google Sheet.
  // For this mock, if the URL isn't "VALID_SHEET_URL_EXAMPLE" or "EMPTY_SHEET_URL_EXAMPLE" and no fallback happened,
  // we'll treat it as an error.
  // throw new Error("AI Flow: Invalid or inaccessible Google Sheet URL for mock data processing.");
  return null;
}
