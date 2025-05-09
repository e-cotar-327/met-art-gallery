document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const gallery = document.querySelector(".gallery");
  const searchInput = document.querySelector(".search-input");
  const searchBtn = document.querySelector(".search-btn");
  const loading = document.querySelector(".loading");
  const errorMessage = document.querySelector(".error-message");
  const modal = document.querySelector(".modal");
  const closeModal = document.querySelector(".close-modal");
  const modalImage = document.querySelector(".modal-image");
  const modalTitle = document.querySelector(".modal-title");
  const modalArtist = document.querySelector(".modal-artist");
  const modalInfo = document.querySelector(".modal-info");
  const prevBtn = document.querySelector(".prev-btn");
  const nextBtn = document.querySelector(".next-btn");

  // API Endpoints
  const BASE_URL = "https://collectionapi.metmuseum.org/public/collection/v1";
  const OBJECTS_ENDPOINT = `${BASE_URL}/objects`;
  const SEARCH_ENDPOINT = `${BASE_URL}/search`;

  // State
  let currentPage = 1;
  let objectIds = [];
  let currentSearchTerm = "";
  const PAGE_SIZE = 20;

  // Initialize the gallery with highlights
  initializeGallery();

  // Event listeners
  searchBtn.addEventListener("click", performSearch);
  searchInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      performSearch();
    }
  });

  closeModal.addEventListener("click", function () {
    modal.style.display = "none";
  });

  window.addEventListener("click", function (e) {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });

  prevBtn.addEventListener("click", loadPreviousPage);
  nextBtn.addEventListener("click", loadNextPage);

  // Functions
  function initializeGallery() {
    // Start with highlighted paintings
    currentSearchTerm = "sunflower";
    fetchSearchResults(currentSearchTerm);
  }

  function performSearch() {
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
      currentPage = 1;
      currentSearchTerm = searchTerm;
      fetchSearchResults(searchTerm);
    }
  }

  function fetchSearchResults(searchTerm) {
    showLoading(true);
    clearGallery();

    // Add hasImages=true to only get objects with images
    fetch(
      `${SEARCH_ENDPOINT}?hasImages=true&q=${encodeURIComponent(searchTerm)}`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        if (data.total === 0) {
          showError(
            `No results found for "${searchTerm}". Try another search term.`
          );
          objectIds = [];
          updatePaginationButtons();
        } else {
          objectIds = data.objectIDs;
          loadArtworksForCurrentPage();
        }
      })
      .catch((error) => {
        showError("Error fetching search results. Please try again later.");
        console.error("Search error:", error);
      });
  }

  function loadArtworksForCurrentPage() {
    showLoading(true);
    clearGallery();

    // Calculate start and end indices for current page
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, objectIds.length);

    // Get the slice of object IDs for the current page
    const currentPageIds = objectIds.slice(startIndex, endIndex);

    // Use Promise.all to fetch all artwork details in parallel
    const fetchPromises = currentPageIds.map((id) =>
      fetch(`${OBJECTS_ENDPOINT}/${id}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to fetch object ${id}`);
          }
          return response.json();
        })
        .catch((error) => {
          console.error(`Error fetching object ${id}:`, error);
          return null; // Return null for failed fetches
        })
    );

    Promise.all(fetchPromises)
      .then((artworks) => {
        // Filter out null results (failed fetches)
        const validArtworks = artworks.filter((artwork) => artwork !== null);

        if (validArtworks.length === 0) {
          showError(
            "No valid artworks found for this page. Try another search or page."
          );
        } else {
          displayArtworks(validArtworks);
          updatePaginationButtons();
        }
        showLoading(false);
      })
      .catch((error) => {
        showError("Error loading artworks. Please try again later.");
        console.error("Error loading artworks:", error);
        showLoading(false);
      });
  }

  function displayArtworks(artworks) {
    clearGallery();

    artworks.forEach((artwork) => {
      // Skip artworks without images
      if (!artwork.primaryImage && !artwork.primaryImageSmall) {
        return;
      }

      const artworkElement = document.createElement("div");
      artworkElement.className = "artwork";
      artworkElement.setAttribute("data-id", artwork.objectID);

      // Use primary image if available, otherwise use small image
      const imageUrl = artwork.primaryImageSmall || artwork.primaryImage;

      artworkElement.innerHTML = `
                        <img src="${imageUrl}" alt="${
        artwork.title
      }" class="artwork-img">
                        <div class="artwork-info">
                            <div class="artwork-title">${
                              artwork.title || "Untitled"
                            }</div>
                            <div class="artwork-artist">${
                              artwork.artistDisplayName || "Unknown Artist"
                            }</div>
                            <div class="artwork-date">${
                              artwork.objectDate || "Date unknown"
                            }</div>
                        </div>
                    `;

      artworkElement.addEventListener("click", () =>
        showArtworkDetails(artwork)
      );

      gallery.appendChild(artworkElement);
    });
  }

  function showArtworkDetails(artwork) {
    modalImage.src = artwork.primaryImage || artwork.primaryImageSmall;
    modalImage.alt = artwork.title;

    modalTitle.textContent = artwork.title || "Untitled";
    modalArtist.textContent = artwork.artistDisplayName
      ? `${artwork.artistDisplayName}${
          artwork.artistDisplayBio ? ` (${artwork.artistDisplayBio})` : ""
        }`
      : "Unknown Artist";

    // Clear previous info
    modalInfo.innerHTML = "";

    // Add artwork details
    const details = [
      { label: "Date", value: artwork.objectDate },
      { label: "Medium", value: artwork.medium },
      { label: "Dimensions", value: artwork.dimensions },
      { label: "Classification", value: artwork.classification },
      { label: "Department", value: artwork.department },
      { label: "Culture", value: artwork.culture },
      { label: "Period", value: artwork.period },
      { label: "Credit", value: artwork.creditLine },
      { label: "View at Museum", value: artwork.objectURL, isLink: true },
    ];

    details.forEach((detail) => {
      if (detail.value) {
        const infoItem = document.createElement("div");
        infoItem.className = "info-item";

        if (detail.isLink) {
          infoItem.innerHTML = `
                                <span class="info-label">${detail.label}:</span> 
                                <a href="${detail.value}" target="_blank">View on Met Website</a>
                            `;
        } else {
          infoItem.innerHTML = `
                                <span class="info-label">${detail.label}:</span> 
                                <span>${detail.value}</span>
                            `;
        }

        modalInfo.appendChild(infoItem);
      }
    });

    modal.style.display = "block";
  }

  function loadPreviousPage() {
    if (currentPage > 1) {
      currentPage--;
      loadArtworksForCurrentPage();
    }
  }

  function loadNextPage() {
    if (currentPage * PAGE_SIZE < objectIds.length) {
      currentPage++;
      loadArtworksForCurrentPage();
    }
  }

  function updatePaginationButtons() {
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage * PAGE_SIZE >= objectIds.length;
  }

  function clearGallery() {
    gallery.innerHTML = "";
    errorMessage.textContent = "";
  }

  function showLoading(isLoading) {
    loading.style.display = isLoading ? "block" : "none";
  }

  function showError(message) {
    errorMessage.textContent = message;
    showLoading(false);
  }
});
