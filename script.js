/* ============================================================
   CONFIGURAÇÃO DA API TMDB
   Substitua 'SUA_API_KEY_AQUI' pela sua chave (para testes).
   Em produção, use GitHub Secrets + Actions.
============================================================ */
const TMDB_API_KEY = 'SUA_API_KEY_AQUI'; // ⚠️ Troque ou use variável de ambiente
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';

/* ============================================================
   ESTADO GLOBAL
============================================================ */
let moviesData = []; // Será preenchido com dados reais da API
let currentCategory = 'todos';
let currentSearchTerm = '';

/* ============================================================
   ELEMENTOS DOM
============================================================ */
const moviesGrid = document.getElementById('moviesGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const categoriesFilter = document.getElementById('categoriesFilter');
const detailsModal = document.getElementById('detailsModal');
const detailsContent = document.getElementById('detailsContent');
const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');
const heroExploreBtn = document.getElementById('heroExploreBtn');

/* ============================================================
   FUNÇÃO PARA BUSCAR FILMES POPULARES (API TMDB)
============================================================ */
async function fetchPopularMovies() {
  try {
    moviesGrid.innerHTML = '<div class="no-results">Carregando filmes reais...</div>';
    
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=pt-BR&page=1`
    );
    
    if (!response.ok) throw new Error('Falha ao buscar filmes');
    
    const data = await response.json();
    moviesData = data.results || [];
    
    renderMovies();
  } catch (error) {
    console.error('Erro TMDB:', error);
    moviesGrid.innerHTML = `
      <div class="no-results">
        <i class="fas fa-exclamation-triangle" style="font-size:2rem; display:block; margin-bottom:1rem;"></i>
        Não foi possível carregar os filmes. Verifique sua API Key.
      </div>
    `;
  }
}

/* ============================================================
   FUNÇÃO PARA BUSCAR FILMES POR GÊNERO
============================================================ */
async function fetchMoviesByGenre(genreId) {
  try {
    moviesGrid.innerHTML = '<div class="no-results">Buscando filmes...</div>';
    
    const response = await fetch(
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=pt-BR&with_genres=${genreId}&sort_by=popularity.desc`
    );
    
    if (!response.ok) throw new Error('Falha ao buscar filmes por gênero');
    
    const data = await response.json();
    moviesData = data.results || [];
    
    renderMovies();
  } catch (error) {
    console.error('Erro TMDB:', error);
    moviesGrid.innerHTML = '<div class="no-results">Erro ao buscar filmes por categoria.</div>';
  }
}

/* ============================================================
   FUNÇÃO PARA PESQUISAR FILMES (API TMDB)
============================================================ */
async function searchMovies(query) {
  if (!query.trim()) {
    fetchPopularMovies();
    return;
  }
  
  try {
    moviesGrid.innerHTML = '<div class="no-results">Pesquisando...</div>';
    
    const response = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(query)}`
    );
    
    if (!response.ok) throw new Error('Falha na pesquisa');
    
    const data = await response.json();
    moviesData = data.results || [];
    
    renderMovies();
  } catch (error) {
    console.error('Erro TMDB:', error);
    moviesGrid.innerHTML = '<div class="no-results">Erro na pesquisa. Tente novamente.</div>';
  }
}

/* ============================================================
   RENDERIZAR FILMES (Com dados reais)
============================================================ */
function renderMovies() {
  if (!moviesData || moviesData.length === 0) {
    moviesGrid.innerHTML = `<div class="no-results"><i class="fas fa-search" style="font-size:2rem; display:block; margin-bottom:1rem;"></i> Nenhum filme encontrado.</div>`;
    return;
  }

  moviesGrid.innerHTML = moviesData.map(movie => {
    const posterUrl = movie.poster_path 
      ? `${TMDB_IMAGE_BASE}${movie.poster_path}` 
      : 'https://placehold.co/600x900/1a1f2b/e50914?text=Sem+Capa';
    
    const year = movie.release_date ? movie.release_date.substring(0, 4) : 'N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    
    // Gênero: como a API de listagem não retorna o nome do gênero diretamente,
    // exibimos uma aproximação ou deixamos vazio. Para simplificar, mostramos a nota.
    return `
      <div class="movie-card" data-id="${movie.id}">
        <img class="card-img" src="${posterUrl}" alt="${movie.title}" loading="lazy">
        <div class="card-info">
          <h3 class="card-title">${movie.title}</h3>
          <div class="card-meta">
            <span>${year}</span>
            <span><i class="fas fa-star"></i> ${rating}</span>
          </div>
          <button class="btn-details" data-id="${movie.id}">
            <i class="fas fa-info-circle"></i> Ver detalhes
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Adicionar evento aos botões "Ver detalhes"
  document.querySelectorAll('.btn-details').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      openDetails(id);
    });
  });
}

/* ============================================================
   ABRIR DETALHES (Buscando dados completos e trailer)
============================================================ */
async function openDetails(movieId) {
  try {
    detailsContent.innerHTML = '<div style="text-align:center; padding:3rem;">Carregando detalhes...</div>';
    detailsModal.classList.add('open');

    // Buscar detalhes completos do filme
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=pt-BR`
    );
    
    if (!response.ok) throw new Error('Falha ao buscar detalhes');
    
    const movie = await response.json();
    
    // Buscar trailer
    let trailerKey = null;
    try {
      const videoRes = await fetch(
        `${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=pt-BR`
      );
      const videoData = await videoRes.json();
      const trailer = videoData.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
      if (trailer) trailerKey = trailer.key;
    } catch (e) {
      console.warn('Trailer não disponível');
    }

    const posterUrl = movie.poster_path 
      ? `${TMDB_IMAGE_BASE}${movie.poster_path}` 
      : 'https://placehold.co/600x900/1a1f2b/e50914?text=Sem+Capa';
    
    const backdropUrl = movie.backdrop_path
      ? `${TMDB_BACKDROP_BASE}${movie.backdrop_path}`
      : 'https://placehold.co/1200x600/1a1f2b/e50914?text=Kaisen+Filmes';

    // Gêneros
    const genres = movie.genres?.map(g => g.name).join(', ') || 'N/A';
    
    // Duração
    const duration = movie.runtime 
      ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}min` 
      : 'N/A';

    detailsContent.innerHTML = `
      <button class="details-close" id="closeDetailsBtn"><i class="fas fa-times"></i></button>
      <div class="details-layout">
        <div class="details-poster">
          <img src="${posterUrl}" alt="${movie.title}">
        </div>
        <div class="details-info">
          <h2>${movie.title}</h2>
          <div class="details-meta">
            <span><i class="far fa-calendar-alt"></i> ${movie.release_date || 'N/A'}</span>
            <span><i class="fas fa-tag"></i> ${genres}</span>
            <span><i class="far fa-clock"></i> ${duration}</span>
            <span><i class="fas fa-star"></i> ${movie.vote_average?.toFixed(1) || 'N/A'}</span>
          </div>
          <p class="details-synopsis">${movie.overview || 'Sinopse não disponível em português.'}</p>
          
          ${trailerKey ? `
            <div class="details-trailer">
              <h4 style="margin-bottom:0.5rem;"><i class="fab fa-youtube" style="color:#e50914;"></i> Trailer Oficial</h4>
              <iframe src="https://www.youtube.com/embed/${trailerKey}" allowfullscreen></iframe>
            </div>
          ` : '<p style="color:#888; margin:1rem 0;">Trailer não disponível.</p>'}
          
          <div class="details-actions">
            <button class="btn-watch" id="watchBtn"><i class="fas fa-play"></i> Assistir</button>
            <button class="btn-back" id="backBtn"><i class="fas fa-arrow-left"></i> Voltar</button>
          </div>
        </div>
      </div>
    `;

    // Botão fechar
    document.getElementById('closeDetailsBtn').addEventListener('click', closeDetails);
    document.getElementById('backBtn').addEventListener('click', closeDetails);
    
    // Botão assistir (abre o trailer ou link)
    document.getElementById('watchBtn').addEventListener('click', () => {
      if (trailerKey) {
        window.open(`https://www.youtube.com/watch?v=${trailerKey}`, '_blank');
      } else {
        alert(`🎬 Você está assistindo "${movie.title}" (demonstração). Nenhum conteúdo real é reproduzido.`);
      }
    });

  } catch (error) {
    console.error('Erro ao abrir detalhes:', error);
    detailsContent.innerHTML = `
      <button class="details-close" id="closeDetailsBtn"><i class="fas fa-times"></i></button>
      <div style="text-align:center; padding:3rem;">
        <p>Erro ao carregar detalhes do filme.</p>
        <button class="btn-back" id="backBtn" style="margin-top:1rem;">Voltar</button>
      </div>
    `;
    document.getElementById('closeDetailsBtn')?.addEventListener('click', closeDetails);
    document.getElementById('backBtn')?.addEventListener('click', closeDetails);
  }
}

function closeDetails() {
  detailsModal.classList.remove('open');
}

/* ============================================================
   FILTRO POR CATEGORIA (Gêneros do TMDB)
============================================================ */
categoriesFilter.addEventListener('click', (e) => {
  const btn = e.target.closest('.cat-btn');
  if (!btn) return;

  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const category = btn.dataset.category;
  
  if (category === 'todos') {
    currentCategory = 'todos';
    fetchPopularMovies();
  } else {
    currentCategory = category;
    fetchMoviesByGenre(category); // genreId numérico
  }
});

/* ============================================================
   PESQUISA
============================================================ */
function performSearch() {
  const query = searchInput.value.trim();
  searchMovies(query);
}

searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') performSearch();
});

// Busca em tempo real com debounce
let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const query = searchInput.value.trim();
    if (query.length > 2 || query.length === 0) {
      searchMovies(query);
    }
  }, 500);
});

/* ============================================================
   MENU RESPONSIVO
============================================================ */
menuToggle.addEventListener('click', () => {
  mainNav.classList.toggle('active');
});

document.querySelectorAll('nav a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('active');
  });
});

/* ============================================================
   BOTÃO EXPLORAR (HERO)
============================================================ */
heroExploreBtn.addEventListener('click', () => {
  document.querySelector('.section-title').scrollIntoView({ behavior: 'smooth' });
});

/* ============================================================
   INICIALIZAÇÃO
============================================================ */
// Carregar filmes populares ao iniciar
fetchPopularMovies();
