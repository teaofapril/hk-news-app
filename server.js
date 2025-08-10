const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const NewsScraper = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// 뉴스 스크래퍼 인스턴스 생성
const scraper = new NewsScraper();

// CORS 허용
app.use(cors({ origin: '*', credentials: false }));

// JSON 파싱 미들웨어
app.use(express.json());

// 정적 파일 제공 (public 폴더)
app.use(express.static(path.join(__dirname, 'public')));

// 기본 테스트 API
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API is working fine!' });
});

// 전체 뉴스 목록 조회 (필터링 강화)
app.get('/api/news', (req, res) => {
  const { 
    category, 
    subCategory, 
    source, 
    sourceType,
    language, 
    koreaRelevance,
    economicImpact,
    limit = 50 
  } = req.query;
  
  let filteredNews = [...scraper.getNews()];
  
  // 카테고리 필터링
  if (category) {
    filteredNews = filteredNews.filter(news => 
      news.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  // 서브카테고리 필터링
  if (subCategory) {
    filteredNews = filteredNews.filter(news => 
      news.subCategory && news.subCategory.toLowerCase() === subCategory.toLowerCase()
    );
  }
  
  // 소스 필터링
  if (source) {
    filteredNews = filteredNews.filter(news => 
      news.source.toLowerCase().includes(source.toLowerCase())
    );
  }
  
  // 소스 타입 필터링 (premium, free, government, mainland)
  if (sourceType) {
    filteredNews = filteredNews.filter(news => 
      news.sourceType === sourceType.toLowerCase()
    );
  }
  
  // 언어 필터링
  if (language) {
    filteredNews = filteredNews.filter(news => 
      news.language === language.toLowerCase()
    );
  }
  
  // 한국 관련도 필터링 (예: koreaRelevance=7 이상)
  if (koreaRelevance) {
    filteredNews = filteredNews.filter(news => 
      news.koreaRelevance >= parseInt(koreaRelevance)
    );
  }
  
  // 경제 영향도 필터링
  if (economicImpact) {
    filteredNews = filteredNews.filter(news => 
      news.economicImpact === economicImpact.toLowerCase()
    );
  }
  
  // 최신순 정렬
  filteredNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  
  // 제한된 수만큼 반환
  const limitedNews = filteredNews.slice(0, parseInt(limit));
  
  res.json({
    success: true,
    total: filteredNews.length,
    count: limitedNews.length,
    lastUpdate: scraper.getLastUpdate(),
    data: limitedNews
  });
});

// 한국 관련 고관련도 뉴스 (관련도 7 이상)
app.get('/api/news/korea-focused', (req, res) => {
  const koreaNews = scraper.getNews()
    .filter(news => news.koreaRelevance >= 7)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
  res.json({
    success: true,
    count: koreaNews.length,
    lastUpdate: scraper.getLastUpdate(),
    data: koreaNews
  });
});

// 고영향도 경제 뉴스 
app.get('/api/news/high-impact', (req, res) => {
  const highImpactNews = scraper.getNews()
    .filter(news => news.economicImpact === 'high')
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
  res.json({
    success: true,
    count: highImpactNews.length,
    lastUpdate: scraper.getLastUpdate(),
    data: highImpactNews
  });
});

// SCMP 뉴스만
app.get('/api/news/scmp', (req, res) => {
  const scmpNews = scraper.getNews()
    .filter(news => news.source.includes('SCMP'))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
  res.json({
    success: true,
    count: scmpNews.length,
    lastUpdate: scraper.getLastUpdate(),
    data: scmpNews
  });
});

// 중국 본토 뉴스만
app.get('/api/news/mainland', (req, res) => {
  const mainlandNews = scraper.getNews()
    .filter(news => news.sourceType === 'mainland')
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
  res.json({
    success: true,
    count: mainlandNews.length,
    lastUpdate: scraper.getLastUpdate(),
    data: mainlandNews
  });
});

// 일일 브리핑용 (전체 뉴스, 최신순)
app.get('/api/news/daily-briefing', (req, res) => {
  const briefingNews = [...scraper.getNews()]
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
  res.json({
    success: true,
    message: "홍콩 관련 전체 뉴스 브리핑",
    count: briefingNews.length,
    lastUpdate: scraper.getLastUpdate(),
    data: briefingNews
  });
});

// 카테고리 목록 조회
app.get('/api/categories', (req, res) => {
  const categories = [...new Set(scraper.getNews().map(news => news.category))];
  
  res.json({
    success: true,
    data: categories
  });
});

// 뉴스 소스 목록 조회  
app.get('/api/sources', (req, res) => {
  const sources = [...new Set(scraper.getNews().map(news => news.source))];
  
  res.json({
    success: true,
    data: sources
  });
});

// 수동 뉴스 업데이트
app.post('/api/news/update', async (req, res) => {
  try {
    console.log('🔄 수동 뉴스 업데이트 요청...');
    await scraper.scrapeAllNews();
    
    res.json({
      success: true,
      message: '뉴스가 성공적으로 업데이트되었습니다',
      count: scraper.getNews().length,
      lastUpdate: scraper.getLastUpdate()
    });
  } catch (error) {
    console.error('뉴스 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      message: '뉴스 업데이트에 실패했습니다'
    });
  }
});

// 시스템 상태 확인
app.get('/api/status', (req, res) => {
  const newsCount = scraper.getNews().length;
  const lastUpdate = scraper.getLastUpdate();
  
  res.json({
    success: true,
    status: 'running',
    newsCount: newsCount,
    lastUpdate: lastUpdate,
    sources: {
      scmp: scraper.getNews().filter(n => n.source.includes('SCMP')).length,
      chinaDaily: scraper.getNews().filter(n => n.source === 'China Daily').length,
      hkGov: scraper.getNews().filter(n => n.sourceType === 'government').length,
      reuters: scraper.getNews().filter(n => n.source === 'Reuters').length
    }
  });
});

// 특정 뉴스 상세 조회 (맨 마지막에 배치)
app.get('/api/news/:id', (req, res) => {
  const newsId = req.params.id;
  const news = scraper.getNews().find(item => item.id === newsId);
  
  if (!news) {
    return res.status(404).json({
      success: false,
      message: 'News not found'
    });
  }
  
  res.json({
    success: true,
    data: news
  });
});

// 서버 시작시 초기 뉴스 로드
async function initializeServer() {
  console.log('🚀 서버 초기화 중...');
  try {
    await scraper.scrapeAllNews();
    console.log('✅ 초기 뉴스 로드 완료');
  } catch (error) {
    console.error('❌ 초기 뉴스 로드 실패:', error);
  }
}

// 매 30분마다 뉴스 자동 업데이트
cron.schedule('*/30 * * * *', async () => {
  console.log('⏰ 자동 뉴스 업데이트 시작...');
  try {
    await scraper.scrapeAllNews();
    console.log('✅ 자동 뉴스 업데이트 완료');
  } catch (error) {
    console.error('❌ 자동 뉴스 업데이트 실패:', error);
  }
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`📰 News API endpoints:`);
  console.log(`   GET /api/news - 전체 뉴스`);
  console.log(`   GET /api/news/daily-briefing - 일일 브리핑`);
  console.log(`   GET /api/status - 시스템 상태`);
  console.log(`   POST /api/news/update - 수동 업데이트`);
  console.log(`⏰ 자동 업데이트: 매 30분마다`);
  
  // 서버 시작 후 초기화
  initializeServer();
});