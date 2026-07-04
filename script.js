// ==========================================
// 1. GLOBAL VARIABLES, API & CONFIG
// ==========================================
const API_KEY = "9a22d1b05594be441e0b6fd340e0b91b";
const PROXY_URL = "https://corsproxy.io/?"; 
const FALLBACK_IMG = "https://via.placeholder.com/500x750?text=No+Poster";

let searchTimeout;
const searchInput = document.getElementById("Search-input");
const list = document.querySelector(".Watchlist-container");
const content = document.querySelector(".content");
const dialog = document.querySelector(".dialog");
const filmRating = document.querySelector(".top-rated");
const tradingMovies = document.querySelector(".trading-movie");
const popularMovies = document.querySelector(".popular-movie");
const topRatedMovies = document.querySelector(".top-rated-list");
const mainContainer = document.querySelector(".main-container");

let watchList = JSON.parse(localStorage.getItem("movieList")) || [];

let currentPage = 1;
let currentFetchUrl = "";
let currentSearchTerm = "";
let isSearchActive = false;

// ==========================================
// 2. HELPER FUNCTIONS & SEPARATED API LOGIC
// ==========================================

// ✅ Separate API logic from UI logic & Show user-friendly error messages
async function fetchAPI(endpoint) {
  try {
    const finalUrl = PROXY_URL + encodeURIComponent(endpoint);
    const response = await fetch(finalUrl);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Fetch Error:", error);
    alert("⚠️ Network Error: Unable to fetch movies. Please check your connection.");
    return null; // Return null so UI doesn't crash
  }
}

// ✅ Add fallback image when poster is missing
function getPosterUrl(path) {
  if (!path) return FALLBACK_IMG;
  const cleanPath = path.replace(/"/g, "");
  return `https://image.tmdb.org/t/p/w500${cleanPath}`;
}

// ✅ Create a reusable movie card rendering function (Removes DOM creation repetition)
function createMovieCard(item, className = "movie-Box") {
  const box = document.createElement("div");
  box.classList.add(className);

  const displayTitle = item.title || item.name;
  const posterUrl = getPosterUrl(item.poster_path);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : "N/A";
  
  let mediaBadge = "";
  if (item.media_type && item.media_type !== "person") {
    mediaBadge = `<p style="font-size: 12px; color: gray; margin-bottom: 10px;">${item.media_type === "tv" ? "📺 TV Show" : "🎬 Movie"}</p>`;
  }

  box.innerHTML = `
    <img src="${posterUrl}" alt="${displayTitle}" class="movie-poster">
    <p id="movie-title" style="margin-bottom: 5px;">${displayTitle}</p>
    <span>⭐ ${rating}</span>
    ${mediaBadge}
  `;

  const poster = box.querySelector(".movie-poster");
  poster.addEventListener("click", () => choseMovie(item));
  
  return box;
}

// ==========================================
// 3. MAIN SEARCH API
// ==========================================
async function searchMovie(isLoadMore = false) {
  if (!searchInput) return;

  if (!isLoadMore) {
    currentSearchTerm = searchInput.value.trim();
    currentPage = 1;
    isSearchActive = true;
    
    if (!currentSearchTerm) {
      if (mainContainer) mainContainer.innerHTML = "";
      return;
    }
    history.pushState({ search: currentSearchTerm }, "", `?search=${currentSearchTerm}`);
  }

  const url = `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${currentSearchTerm}&page=${currentPage}`;
  const data = await fetchAPI(url);
  if (!data) return;

  if (!isLoadMore) {
    mainContainer.innerHTML = "";
    mainContainer.classList.add("grid-layout");
  }

  data.results.forEach((item) => {
    if (item.media_type === "person") return;
    const card = createMovieCard(item, "movie-Box");
    mainContainer.appendChild(card);
  });
}

// ==========================================
// 4. DIALOG / MODAL SYSTEM WITH TRAILER
// ==========================================
async function choseMovie(item) {
  if (!dialog) return;
  dialog.innerHTML = '<div class="film-box"><h3 style="color:white;">Loading details...</h3></div>';
  dialog.showModal();

  const displayTitle = item.title || item.name || item.original_title;
  const displayDate = item.release_date || item.first_air_date || "N/A";
  const posterUrl = getPosterUrl(item.poster_path);
  const movieId = item.id; 
  const mediaType = item.media_type || 'movie'; 

  let trailerHtml = "";
  const videoUrl = `https://api.themoviedb.org/3/${mediaType}/${movieId}/videos?api_key=${API_KEY}`;
  const videoData = await fetchAPI(videoUrl);
  
  if (videoData && videoData.results) {
    const trailer = videoData.results.find(vid => vid.type === "Trailer" && vid.site === "YouTube");
    if (trailer) {
      trailerHtml = `
        <div style="margin-top: 15px;">
          <iframe width="100%" height="250" src="https://www.youtube.com/embed/${trailer.key}?autoplay=0" frameborder="0" allowfullscreen style="border-radius: 8px;"></iframe>
        </div>`;
    }
  }

  dialog.innerHTML = ""; 
  const filmBox = document.createElement("div");
  filmBox.classList.add("film-box");

  filmBox.innerHTML = `
    <img src="${posterUrl}" class="film-poster" alt="${displayTitle}">
    <div class="film-details">
      <h3 class="film-title" style="font-size: 2rem; margin-bottom: 10px;">${displayTitle}</h3>
      <p style="margin-bottom: 5px;"><strong>Released:</strong> ${displayDate}</p>
      <p style="margin-bottom: 5px;"><strong>TMDb Rating:</strong> ⭐ ${item.vote_average || "N/A"}</p>
      <p style="margin-bottom: 15px; line-height: 1.5; color: #bbb;"><strong>Plot:</strong> ${item.overview || "Plot not available."}</p>
      
      ${trailerHtml}

      <div style="display: flex; gap: 10px; margin-top: 15px;">
        <button id="add" style="padding: 10px 20px; cursor: pointer; background: white; color: black;">Add to WatchList</button>
        <button id="close-dialog" class="dialog-close-btn" style="padding: 10px 20px; cursor: pointer; background: #ff4757; color: white; border:none; border-radius:4px;">Close</button>
      </div>
    </div>
  `;

  const addWatch = filmBox.querySelector("#add");
  addWatch.addEventListener("click", () => {
    const exists = watchList.some((movie) => movie.id === movieId);
    if (exists) {
      alert("⚠️ Movie already added to Watchlist!");
      return;
    }
    watchList.unshift({
      id: movieId, 
      Title: displayTitle,
      Poster: posterUrl,
      Rating: item.vote_average ? item.vote_average.toFixed(1) : "N/A",
      fullData: item // 🔥 YAHAN CHANGE KIYA: Poora movie data save kar liya taaki watchlist mein use ho sake
    });
    localStorage.setItem("movieList", JSON.stringify(watchList));
    alert(`✅ ${displayTitle} Added in the WatchList!`);
    if (list) renderMovie();
  });

  const closeBtn = filmBox.querySelector("#close-dialog");
  closeBtn.addEventListener("click", () => {
    dialog.innerHTML = ""; 
    dialog.close();
  });

  dialog.appendChild(filmBox);
}

// ==========================================
// 5. WATCHLIST SYSTEM (Updated Empty State)
// ==========================================
if (list) {
  renderMovie();
}

function renderMovie() {
  const savedMoviesRaw = localStorage.getItem("movieList");
  let savedMovies = savedMoviesRaw ? JSON.parse(savedMoviesRaw) : [];
  list.innerHTML = "";

  // 🔥 EMPTY STATE LOGIC: Centered big icon with text
  if (savedMovies.length === 0) {
    list.innerHTML = `
      <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; text-align: center;">
        <i class="ri-film-line" style="font-size: 10rem; color: #9268f7; margin-bottom: 15px;"></i>
        <h2 style="color: whitesmoke; font-size: 2rem; margin-bottom: 10px;">Your Watchlist is Empty</h2>
        <p style="color: gray; font-size: 1.1rem;">Explore movies and click 'Add to WatchList' to see them here! 🍿</p>
      </div>
    `;
    return;
  }

  // Agar movies hain, toh render karo
  savedMovies.forEach((liked) => {
    const banner = document.createElement("div");
    banner.classList.add("movie-Box");
    banner.innerHTML = `
      <img src="${liked.Poster}" alt="${liked.Title}" class="Movie-photo" style="cursor: pointer;">
      <p id="movie-title">${liked.Title}</p>
      <span>⭐${liked.Rating || "N/A"}</span>
      <button class="remove-bnt" style="background: #ff4757; color: white; border: none; padding: 8px; border-radius: 5px; margin-top: 10px; width: 100%; cursor: pointer;">Remove</button>
    `;

    // Click on Watchlist poster to open dialog
    const posterClick = banner.querySelector(".Movie-photo");
    posterClick.addEventListener("click", async () => {
      if (liked.fullData) {
        choseMovie(liked.fullData);
      } else {
        const fallbackData = await fetchAPI(`https://api.themoviedb.org/3/movie/${liked.id}?api_key=${API_KEY}`);
        if (fallbackData) choseMovie(fallbackData);
      }
    });

    // Remove Button logic
    const removeBtn = banner.querySelector(".remove-bnt");
    removeBtn.addEventListener("click", () => {
      savedMovies = savedMovies.filter((movie) => movie.id !== liked.id);
      watchList = savedMovies;
      localStorage.setItem("movieList", JSON.stringify(savedMovies));
      renderMovie();
    });
    
    list.appendChild(banner);
  });
}
// ==========================================
// 6. ORIGINAL HOME PAGE LOGIC 
// ==========================================
async function getTrendingMovies() {
  if (!tradingMovies) return;
  const url = `https://api.themoviedb.org/3/trending/movie/day?api_key=${API_KEY}`;
  const data = await fetchAPI(url);
  if (!data) return;

  tradingMovies.innerHTML = "";
  const topFourMovies = data.results.slice(0, 4);
  topFourMovies.forEach((film) => {
    const card = createMovieCard(film, "movie");
    tradingMovies.appendChild(card);
  });
}
getTrendingMovies();

async function getPopularMovies() {
  if (!popularMovies) return;
  const url = `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=en-US&page=1`;
  const data = await fetchAPI(url);
  if (!data) return;

  popularMovies.innerHTML = "";
  const topFourMovies = data.results.slice(2, 6);
  topFourMovies.forEach((film) => {
    const card = createMovieCard(film, "movie");
    popularMovies.appendChild(card);
  });
}
getPopularMovies();

async function getTopRatedMovies() {
  if (!topRatedMovies) return;
  const url = `https://api.themoviedb.org/3/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`;
  const data = await fetchAPI(url);
  if (!data) return;

  topRatedMovies.innerHTML = "";
  const topFourMovies = data.results.slice(2, 5);
  topFourMovies.forEach((film) => {
    const card = createMovieCard(film, "list-img");
    topRatedMovies.appendChild(card);
  });
}
getTopRatedMovies();

// ==========================================
// 7. MOVIE CATEGORY
// ==========================================
async function fetchCategoryMovies(url, isLoadMore = false) {
  if (!mainContainer) return;
  
  const finalUrl = url.includes("trending") ? url : `${url}&page=${currentPage}`;
  const data = await fetchAPI(finalUrl);
  if (!data) return;

  if (!isLoadMore) {
    mainContainer.innerHTML = "";
    mainContainer.classList.add("grid-layout");
  }

  data.results.forEach((film) => {
    const card = createMovieCard(film, "movie-Box");
    mainContainer.appendChild(card);
  });
}

function handleCategoryClick(categoryName, url) {
  history.pushState({ category: categoryName }, "", `?category=${categoryName}`);
  currentFetchUrl = url;
  currentPage = 1;
  isSearchActive = false;
  fetchCategoryMovies(currentFetchUrl, false);
}

// 8. EVENT LISTENERS
const loadMoreBtnEl = document.getElementById("load-more-btn"); // To avoid conflict

document.querySelector(".top-rated-btn")?.addEventListener("click", (e) => {
  e.preventDefault();
  handleCategoryClick("top_rated", `https://api.themoviedb.org/3/movie/top_rated?api_key=${API_KEY}&language=en-US`);
  if(loadMoreBtnEl) loadMoreBtnEl.style.display = "flex";
});

document.querySelector(".top-btn")?.addEventListener("click", (e) => {
  e.preventDefault();
  handleCategoryClick("top_rated", `https://api.themoviedb.org/3/movie/top_rated?api_key=${API_KEY}&language=en-US`);
  if(loadMoreBtnEl) loadMoreBtnEl.style.display = "flex";
});

document.querySelector(".action-btn")?.addEventListener("click", (e) => {
  e.preventDefault();
  handleCategoryClick("action", `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=28`);
  if(loadMoreBtnEl) loadMoreBtnEl.style.display = "flex";
});

document.querySelector(".adventure-btn")?.addEventListener("click", (e) => {
  e.preventDefault();
  handleCategoryClick("adventure", `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=12`);
  if(loadMoreBtnEl) loadMoreBtnEl.style.display = "flex";
});

document.querySelector(".scifi-btn")?.addEventListener("click", (e) => {
  e.preventDefault();
  handleCategoryClick("scifi", `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=878`);
  if(loadMoreBtnEl) loadMoreBtnEl.style.display = "flex";
});

document.querySelector(".comedy-btn")?.addEventListener("click", (e) => {
  e.preventDefault();
  handleCategoryClick("comedy", `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=35`);
  if(loadMoreBtnEl) loadMoreBtnEl.style.display = "flex";
});

document.querySelector(".fantasy-btn")?.addEventListener("click", (e) => {
  e.preventDefault();
  handleCategoryClick("fantasy", `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=14`);
  if(loadMoreBtnEl) loadMoreBtnEl.style.display = "flex";
});

document.querySelector(".popular-movie-btn")?.addEventListener("click", (e) => {
  e.preventDefault();
  handleCategoryClick("popular", `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=en-US`);
  if(loadMoreBtnEl) loadMoreBtnEl.style.display = "flex";
});

document.querySelector(".trading-movie-btn")?.addEventListener("click", (e) => {
  e.preventDefault();
  handleCategoryClick("trending", `https://api.themoviedb.org/3/trending/movie/day?api_key=${API_KEY}`);
  if(loadMoreBtnEl) loadMoreBtnEl.style.display = "flex";
});

if (loadMoreBtnEl) {
  loadMoreBtnEl.addEventListener("click", (e) => {
    e.preventDefault();
    currentPage++;
    if (isSearchActive) {
      searchMovie(true); 
    } else if (currentFetchUrl) {
      fetchCategoryMovies(currentFetchUrl, true); 
    }
  });
}

window.addEventListener("popstate", () => {
  window.location.reload(); 
});

// ==========================================
// 9. NETFLIX STYLE HERO SECTION
// ==========================================
async function loadHeroTrailer() {
  const heroSection = document.getElementById("hero-section");
  const heroInfo = document.getElementById("hero-info");
  
  if (!heroSection || !heroInfo) return; 

  try {
    const trendingUrl = `https://api.themoviedb.org/3/trending/movie/day?api_key=${API_KEY}`;
    const trendingData = await fetchAPI(trendingUrl);
    if (!trendingData) return;

    const topMovie = trendingData.results[2]; 
    if (!topMovie) return;

    const videoUrl = `https://api.themoviedb.org/3/movie/${topMovie.id}/videos?api_key=${API_KEY}`;
    const videoData = await fetchAPI(videoUrl);

    const trailer = videoData?.results?.find(vid => vid.type === "Trailer" && vid.site === "YouTube");

    if (trailer) {
      const iframeHtml = `
        <iframe 
          id="hero-youtube-player" 
          class="video-background"
          src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailer.key}&modestbranding=1&rel=0&showinfo=0&enablejsapi=1" 
          frameborder="0" 
          allow="autoplay; encrypted-media" 
          allowfullscreen>
        </iframe>
      `;
      heroSection.insertAdjacentHTML('afterbegin', iframeHtml);
    } else {
      heroSection.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${topMovie.backdrop_path})`;
      heroSection.style.backgroundSize = "cover";
      heroSection.style.backgroundPosition = "center";
    }

    heroInfo.innerHTML = `
      <h1 style="font-size: 3rem; margin-bottom: 10px;">${topMovie.title}</h1>
      <p style="font-size: 1rem; margin-bottom: 20px; line-height: 1.5; color: #dcdcdc;">
        ${topMovie.overview.substring(0, 150)}...
      </p>
      <div>
        <button class="hero-btn-play">▶ Play Sound</button>
        <button class="hero-btn-info">ℹ More Info</button>
      </div>
    `;

    const playBtn = document.querySelector(".hero-btn-play");
    const ytPlayer = document.getElementById("hero-youtube-player");
    let isMuted = true; 

    if (playBtn && ytPlayer) {
      playBtn.addEventListener("click", () => {
        if (isMuted) {
          ytPlayer.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
          ytPlayer.contentWindow.postMessage('{"event":"command","func":"setVolume","args":[100]}', '*');
          playBtn.innerHTML = "🔇 Mute Sound"; 
          isMuted = false;
        } else {
          ytPlayer.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*');
          playBtn.innerHTML = "🔊 Play Sound"; 
          isMuted = true;
        }
      });
    }
  } catch (error) {
    console.error("Hero Trailer Error:", error);
  }
}
loadHeroTrailer();