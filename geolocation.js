// Geolocation setup including IP-based and exact location detection
// module to configure the geolocation widget for InstantSearch
import configure from "instantsearch.js/es/widgets/configure/configure.js";

// function to set up geolocation for the search instance
export function setupGeolocation(search, onLocationChange) {
  let locationWidget;
  const statusEl = document.querySelector("#geolocation-status");
  const exactButton = document.querySelector("#geolocation-button");

  // function to set the location for the search instance and status text
  const setLocation = (latLng, statusText) => {
    const [latitude, longitude] = latLng.split(",").map(Number);
    onLocationChange?.({ latitude, longitude });
    // remove the previous location widget if it exists
    if (locationWidget) search.removeWidgets([locationWidget]);
    // create or update the widget and text
    locationWidget = configure({ aroundLatLng: latLng });
    search.addWidgets([locationWidget]);
    statusEl.textContent = statusText;
  };

  // using ipwho to get the location info based on the ip
  const useIpLocation = async () => {
    try {
      const response = await fetch("https://ipwho.is/");
      const { success, city, region, latitude, longitude } = await response.json();
      if (!success) throw new Error("IP lookup failed");
      setLocation(
        `${latitude},${longitude}`,
        `It looks like you are in ${city}, ${region} (based on your IP)`
      );
    } catch {
      statusEl.textContent = "Location not available";
    }
  };

  // set up the behaviour for the exact location button
  exactButton.addEventListener("click", () => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        setLocation(
          `${latitude},${longitude}`,
          "Exact location detected; finding your area..."
        );
        exactButton.hidden = true;

        // perform reverse geocoding to get the place name based on the exact location using BigDataCloud API
        try {
          const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
          // set the query parameters for the reverse geocoding request
          url.search = new URLSearchParams({ latitude, longitude, localityLanguage: "en" });
          const response = await fetch(url);
          if (!response.ok) throw new Error("Reverse geocoding failed");
          const place = await response.json();
          const placeName = [
            // use the locality (neighborhood) if available, otherwise fall back to the city
            place.locality || place.city,
            // include the principal subdivision (state/province) in the place name
            place.principalSubdivision,
            place.countryName,
            // here filter out missing elements (falsy) and join the remaining parts with commas
          ].filter(Boolean).join(", ");
          statusEl.textContent = placeName
            ? `It looks like you are in ${placeName} (exact location)`
            : "Exact location detected; place name unavailable";
        } catch {
          statusEl.textContent = "Exact location detected; place name unavailable";
        }
      },
      // error callback for when exact location is not available
      () => {
        statusEl.textContent = "Exact location not available";
      }
    );
  });
  // hide the exact location button if geolocation is not supported
  if (!navigator.geolocation) exactButton.hidden = true;
  return useIpLocation();
}