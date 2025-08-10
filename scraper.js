const axios = require('axios');
const cheerio = require('cheerio');
const xml2js = require('xml2js');

class NewsScraper {
  constructor() {
    this.newsData = [];
    this.lastUpdate = null;
  }

  // SCMP RSS 피드 스크래핑 (모든 뉴스 수집)
  async scrapeSCMP() {
    try {
      console.log('📰 SCMP 스크래핑 중...');
      
      const rssFeeds = [
        'https://www.scmp.com/rss/4/feed', // 뉴스
        'https://www.scmp.com/rss/2/feed', // 비즈니스
        'https://www.scmp.com/rss/91/feed', // 중국
        'https://www.scmp.com/rss/322214/feed' // 홍콩
      ];

      const scmpNews = [];
      
      for (const feedUrl of rssFeeds) {
        try {
          const response = await axios.get(feedUrl, {
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          const parser = new xml2js.Parser();
          const result = await parser.parseStringPromise(response.data);
          
          if (result.rss && result.rss.channel && result.rss.channel[0].item) {
            const items = result.rss.channel[0].item;
            
            // 모든 아이템 수집 (제한 없음)
            for (const item of items) {
              const news = {
                id: `scmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: item.title[0],
                summary: this.cleanDescription(item.description ? item.description[0] : ''),
                source: 'SCMP',
                sourceType: 'hk_media',
                category: this.categorizeNews(item.title[0], item.description ? item.description[0] : ''),
                subCategory: this.getSubCategory(item.title[0], item.description ? item.description[0] : ''),
                publishedAt: new Date(item.pubDate[0]).toISOString(),
                url: item.link[0],
                language: 'en',
                tags: this.extractTags(item.title[0], item.description ? item.description[0] : ''),
                economicImpact: this.assessEconomicImpact(item.title[0], item.description ? item.description[0] : ''),
                insights: this.generateInsights(item.title[0], item.description ? item.description[0] : '')
              };
              
              scmpNews.push(news);
            }
          }
        } catch (feedError) {
          console.error(`SCMP RSS 피드 오류 (${feedUrl}):`, feedError.message);
        }
      }
      
      console.log(`✅ SCMP: ${scmpNews.length}개 뉴스 수집`);
      return scmpNews;
      
    } catch (error) {
      console.error('SCMP RSS 스크래핑 실패:', error.message);
      return [];
    }
  }

  // 홍콩 전문 매체들 스크래핑 (모든 뉴스)
  async scrapeHKMedia() {
    console.log('📰 홍콩 전문 매체 스크래핑 중...');
    const hkNews = [];
    
    const sources = [
      {
        name: 'HKFP',
        url: 'https://hongkongfp.com/feed/',
        sourceType: 'hk_media'
      }
    ];
    
    for (const source of sources) {
      try {
        const response = await axios.get(source.url, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);
        
        if (result.rss && result.rss.channel && result.rss.channel[0].item) {
          const items = result.rss.channel[0].item;
          
          // 모든 아이템 수집
          for (const item of items) {
            const title = item.title[0];
            const description = item.description ? item.description[0] : '';
            
            const news = {
              id: `hk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: title,
              summary: this.cleanDescription(description),
              source: source.name,
              sourceType: source.sourceType,
              category: this.categorizeNews(title, description),
              subCategory: '홍콩',
              publishedAt: new Date(item.pubDate[0]).toISOString(),
              url: item.link[0],
              language: 'en',
              tags: this.extractTags(title, description),
              economicImpact: this.assessEconomicImpact(title, description),
              insights: this.generateInsights(title, description)
            };
            
            hkNews.push(news);
          }
        }
      } catch (error) {
        console.error(`${source.name} 스크래핑 실패:`, error.message);
      }
    }
    
    console.log(`✅ 홍콩 매체: ${hkNews.length}개 수집`);
    return hkNews;
  }

  // 글로벌 뉴스 소스들 추가 스크래핑
  async scrapeGlobalNews() {
    console.log('📰 글로벌 뉴스 스크래핑 중...');
    const globalNews = [];
    
    const sources = [
      {
        name: 'BBC Business',
        url: 'http://feeds.bbci.co.uk/news/business/rss.xml',
        sourceType: 'global'
      },
      {
        name: 'Reuters',
        url: 'https://feeds.reuters.com/reuters/worldNews',
        sourceType: 'global'
      },
      {
        name: 'Bloomberg',
        url: 'https://feeds.bloomberg.com/markets/news.rss',
        sourceType: 'global'
      }
    ];
    
    for (const source of sources) {
      try {
        const response = await axios.get(source.url, {
          timeout: 20000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);
        
        if (result.rss && result.rss.channel && result.rss.channel[0].item) {
          const items = result.rss.channel[0].item;
          
          for (const item of items) {
            const title = item.title[0];
            const description = item.description ? item.description[0] : '';
            
            const news = {
              id: `global_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: title,
              summary: this.cleanDescription(description),
              source: source.name,
              sourceType: source.sourceType,
              category: this.categorizeNews(title, description),
              subCategory: this.getSubCategory(title, description),
              publishedAt: new Date(item.pubDate[0]).toISOString(),
              url: item.link[0],
              language: 'en',
              tags: this.extractTags(title, description),
              economicImpact: this.assessEconomicImpact(title, description),
              insights: this.generateInsights(title, description)
            };
            
            globalNews.push(news);
          }
        }
      } catch (error) {
        console.error(`${source.name} 스크래핑 실패:`, error.message);
      }
    }
    
    console.log(`✅ 글로벌 뉴스: ${globalNews.length}개 수집`);
    return globalNews;
  }

  // 모든 뉴스 소스에서 데이터 수집
  async scrapeAllNews() {
    console.log('🚀 전체 뉴스 스크래핑 시작...');
    
    const [scmpNews, hkNews, globalNews] = await Promise.all([
      this.scrapeSCMP(),
      this.scrapeHKMedia(),
      this.scrapeGlobalNews()
    ]);

    this.newsData = [
      ...scmpNews,
      ...hkNews,
      ...globalNews
    ];

    // 중복 제거 (URL 기준)
    const uniqueNews = this.newsData.filter((news, index, arr) => 
      arr.findIndex(n => n.url === news.url) === index
    );

    this.newsData = uniqueNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    this.lastUpdate = new Date();
    
    console.log(`✅ 총 ${this.newsData.length}개 뉴스 수집 완료 (중복 제거 후)`);
    console.log(`📊 소스별 현황:`);
    console.log(`   - SCMP: ${scmpNews.length}개`);
    console.log(`   - 홍콩 매체: ${hkNews.length}개`);
    console.log(`   - 글로벌 뉴스: ${globalNews.length}개`);
    console.log(`📅 마지막 업데이트: ${this.lastUpdate.toLocaleString('ko-KR')}`);
    
    return this.newsData;
  }

  // 유틸리티 함수들
  cleanDescription(desc) {
    return desc.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '').trim().substring(0, 200);
  }

  categorizeNews(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    
    if (text.includes('trade') || text.includes('export') || text.includes('import')) return '무역';
    if (text.includes('economic') || text.includes('economy') || text.includes('gdp')) return '경제지표';
    if (text.includes('stock') || text.includes('market') || text.includes('index')) return '증시';
    if (text.includes('currency') || text.includes('exchange') || text.includes('dollar')) return '환율';
    if (text.includes('investment') || text.includes('fund') || text.includes('venture')) return '투자';
    if (text.includes('bank') || text.includes('finance') || text.includes('financial')) return '금융';
    if (text.includes('crypto') || text.includes('blockchain') || text.includes('fintech')) return '핀테크';
    if (text.includes('property') || text.includes('real estate')) return '부동산';
    if (text.includes('oil') || text.includes('energy') || text.includes('commodity')) return '원자재';
    if (text.includes('policy') || text.includes('government') || text.includes('regulation')) return '정책';
    
    return '일반';
  }

  getSubCategory(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    
    if (text.includes('hong kong') || text.includes('hongkong')) return '홍콩';
    if (text.includes('china') || text.includes('chinese')) return '중국본토';
    if (text.includes('usa') || text.includes('america')) return '미국';
    if (text.includes('europe') || text.includes('britain')) return '유럽';
    if (text.includes('japan') || text.includes('japanese')) return '일본';
    if (text.includes('korea') || text.includes('korean')) return '한국';
    if (text.includes('global') || text.includes('world')) return '글로벌';
    
    return null;
  }

  assessEconomicImpact(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    
    if (text.includes('crisis') || text.includes('billion') || text.includes('major')) return 'high';
    if (text.includes('growth') || text.includes('million') || text.includes('policy')) return 'medium';
    
    return 'low';
  }

  extractTags(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    const tags = [];
    
    if (text.includes('trade')) tags.push('무역');
    if (text.includes('investment')) tags.push('투자');
    if (text.includes('stock') || text.includes('market')) tags.push('증시');
    if (text.includes('finance')) tags.push('금융');
    if (text.includes('china')) tags.push('중국');
    if (text.includes('hong kong')) tags.push('홍콩');
    if (text.includes('economy')) tags.push('경제');
    if (text.includes('policy')) tags.push('정책');
    
    return tags.slice(0, 5);
  }

  generateInsights(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    
    if (text.includes('hong kong') || text.includes('hongkong')) {
      return '홍콩 경제 동향이 아시아 금융허브로서의 역할에 미치는 영향';
    }
    if (text.includes('china') || text.includes('chinese')) {
      return '중국 경제 정책 변화가 글로벌 공급망과 아시아 경제에 미치는 영향';
    }
    if (text.includes('trade')) {
      return '국제 무역 환경 변화가 아시아 역내 무역구조에 미치는 시사점';
    }
    if (text.includes('investment')) {
      return '글로벌 투자 흐름 변화가 아시아 자본시장에 미치는 영향';
    }
    
    return '아시아 태평양 지역 경제 동향이 글로벌 경제에 미치는 시사점';
  }

  getNews() {
    return this.newsData;
  }

  getLastUpdate() {
    return this.lastUpdate;
  }
}

module.exports = NewsScraper;