import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

// Custom metrics to track stage performance separately
const shellDuration = new Trend('shell_req_duration');
const sentimentDuration = new Trend('sentiment_action_req_duration');
const totalPerceivedDuration = new Trend('total_user_perceived_duration');
const fastHitsCounter = new Counter('fast_cache_hits');
const slowMissesCounter = new Counter('slow_cache_misses');

// 💡 IMPORTANT: Replace this hash with your active deployment's 'Next-Action' header hash!
// How to find: Open Chrome DevTools -> Network -> Visit movie page -> Copy 'Next-Action' header from POST request.
const NEXT_ACTION_HASH = __ENV.NEXT_ACTION_HASH || '78dae3ac48456d81cb49fb6c9b4223b809c70ccaaf';

const TARGET_HOST = __ENV.TARGET_HOST || 'movie-insights-seven.vercel.app';

// Pool of 50 diverse, valid IMDb Movie IDs to test realistic cache hit/miss distributions
const MOVIE_POOL = [
  { id: 'tt0111161', title: 'The Shawshank Redemption', rating: '9.3', plot: 'Two imprisoned men bond over a number of years...' },
  { id: 'tt0068646', title: 'The Godfather', rating: '9.2', plot: 'The aging patriarch of an organized crime dynasty...' },
  { id: 'tt0468569', title: 'The Dark Knight', rating: '9.0', plot: 'When the menace known as the Joker emerges...' },
  { id: 'tt0108052', title: "Schindler's List", rating: '9.0', plot: 'In German-occupied Poland during World War II...' },
  { id: 'tt0110912', title: 'Pulp Fiction', rating: '8.9', plot: 'The lives of two mob hitmen, a boxer, a gangster...' },
  { id: 'tt0137523', title: 'Fight Club', rating: '8.8', plot: 'An insomniac office worker and a devil-may-care soap maker...' },
  { id: 'tt1375666', title: 'Inception', rating: '8.8', plot: 'A thief who steals corporate secrets through the use of dream-sharing...' },
  { id: 'tt0816692', title: 'Interstellar', rating: '8.7', plot: 'When Earth becomes uninhabitable in the future...' },
  { id: 'tt0133093', title: 'The Matrix', rating: '8.7', plot: 'When a beautiful stranger leads computer hacker Neo...' },
  { id: 'tt0120737', title: 'The Lord of the Rings: The Fellowship of the Ring', rating: '8.9', plot: 'A meek Hobbit from the Shire and eight companions...' },
  { id: 'tt0167260', title: 'The Lord of the Rings: The Return of the King', rating: '9.0', plot: 'Gandalf and Aragorn lead the World of Men...' },
  { id: 'tt0109830', title: 'Forrest Gump', rating: '8.8', plot: 'The history of the United States from the 1950s to the 70s...' },
  { id: 'tt0076759', title: 'Star Wars: Episode IV - A New Hope', rating: '8.6', plot: 'Luke Skywalker joins forces with a Jedi Knight...' },
  { id: 'tt0080684', title: 'Star Wars: Episode V - The Empire Strikes Back', rating: '8.7', plot: 'After the Rebels are overpowered by the Empire...' },
  { id: 'tt0107290', title: 'Jurassic Park', rating: '8.2', plot: 'A pragmatic paleontologist touring an almost complete theme park...' },
  { id: 'tt0848228', title: 'The Avengers', rating: '8.0', plot: 'Earth\'s mightiest heroes must come together...' },
  { id: 'tt15398776', title: 'Oppenheimer', rating: '8.9', plot: 'The story of American scientist J. Robert Oppenheimer...' },
  { id: 'tt0499549', title: 'Avatar', rating: '7.9', plot: 'A paraplegic Marine dispatched to the moon Pandora...' },
  { id: 'tt0099685', title: 'Goodfellas', rating: '8.7', plot: 'The story of Henry Hill and his life in the mob...' },
  { id: 'tt0071562', title: 'The Godfather Part II', rating: '9.0', plot: 'The early life and career of Vito Corleone in 1920s New York City...' },
  { id: 'tt0114709', title: 'Toy Story', rating: '8.3', plot: 'A cowboy doll is profoundly threatened and jealous...' },
  { id: 'tt0241527', title: "Harry Potter and the Sorcerer's Stone", rating: '7.6', plot: 'An orphaned boy enrolls in a school of wizardry...' },
  { id: 'tt0120338', title: 'Titanic', rating: '7.9', plot: 'A seventeen-year-old aristocrat falls in love with a kind but poor artist...' },
  { id: 'tt0114369', title: 'Se7en', rating: '8.6', plot: 'Two detectives, a rookie and a veteran, hunt a serial killer...' },
  { id: 'tt0103064', title: 'Terminator 2: Judgment Day', rating: '8.6', plot: 'A cyborg, identical to the one who failed to kill Sarah Connor...' },
  { id: 'tt0110357', title: 'The Lion King', rating: '8.5', plot: 'A Lion prince is cast out of his pride by his cruel uncle...' },
  { id: 'tt0317219', title: 'Spirited Away', rating: '8.6', plot: 'During her family\'s move to the suburbs, a 10-year-old girl wanders...' },
  { id: 'tt0102926', title: 'The Silence of the Lambs', rating: '8.6', plot: 'A young F.B.I. cadet must receive the help of an incarcerated cannibal...' },
  { id: 'tt0079588', title: 'Alien', rating: '8.5', plot: 'The crew of a commercial spacecraft encounters a deadly lifeform...' },
  { id: 'tt0082971', title: 'Raiders of the Lost Ark', rating: '8.4', plot: 'In 1936, archaeologist Indiana Jones is hired by the U.S. government...' },
  { id: 'tt0120863', title: 'Life Is Beautiful', rating: '8.6', plot: 'When an open-minded Jewish waiter and his son become victims of the Holocaust...' },
  { id: 'tt0169547', title: 'American Beauty', rating: '8.3', plot: 'A sexually frustrated suburban father has a mid-life crisis...' },
  { id: 'tt0253474', title: 'The Pianist', rating: '8.5', plot: 'A Polish Jewish musician struggles to survive the destruction of the Warsaw ghetto...' },
  { id: 'tt0418763', title: 'The Prestige', rating: '8.5', plot: 'After a tragic accident, two stage magicians in 1890s London engage in a battle...' },
  { id: 'tt1160419', title: 'Dune', rating: '8.0', plot: 'A noble family becomes embroiled in a war for control over the galaxy\'s most valuable asset...' },
  { id: 'tt15239678', title: 'Dune: Part Two', rating: '8.6', plot: 'Paul Atreides unites with Chani and the Fremen while seeking revenge...' },
  { id: 'tt0480249', title: 'I Am Legend', rating: '7.2', plot: 'Years after a plague kills most of humanity and transforms the rest into monsters...' },
  { id: 'tt0993846', title: 'The Wolf of Wall Street', rating: '8.2', plot: 'Based on the true story of Jordan Belfort, from his rise to a wealthy stockbroker...' },
  { id: 'tt0898266', title: 'The Big Short', rating: '7.8', plot: 'In 2006-2007 a group of investors bet against the US mortgage market...' },
  { id: 'tt1877830', title: 'The Batman', rating: '7.8', plot: 'When a sadistic serial killer begins murdering key political figures in Gotham...' },
  { id: 'tt1087260', title: 'Spider-Man: No Way Home', rating: '8.2', plot: 'With Spider-Man\'s identity now revealed, Peter asks Doctor Strange for help...' },
  { id: 'tt6751668', title: 'Parasite', rating: '8.5', plot: 'Greed and class discrimination threaten the newly formed symbiotic relationship...' },
  { id: 'tt7286456', title: 'Joker', rating: '8.4', plot: 'During the 1980s, a failed stand-up comedian is driven insane and turns to crime...' },
  { id: 'tt9362722', title: 'Spider-Man: Across the Spider-Verse', rating: '8.6', plot: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People...' },
  { id: 'tt0208594', title: 'The Truman Show', rating: '8.2', plot: 'An insurance salesman discovers his whole life is actually a reality TV show...' },
  { id: 'tt0118715', title: 'The Big Lebowski', rating: '8.1', plot: 'Jeff "The Dude" Lebowski, mistaken for a millionaire of the same name...' },
  { id: 'tt0371724', title: 'The Departed', rating: '8.5', plot: 'An undercover cop and a mole in the police attempt to identify each other...' },
  { id: 'tt0112471', title: 'Before Sunrise', rating: '8.1', plot: 'A young man and woman meet on a train in Europe, and wind up spending one evening together...' },
  { id: 'tt0110357', title: 'Aladdin', rating: '8.0', plot: 'A street urchin fights for the love of a princess with the help of a genie...' },
  { id: 'tt0088247', title: 'The Terminator', rating: '8.1', plot: 'A human soldier is sent from 2029 to 1984 to stop an almost indestructible cyborg...' }
];

export const options = {
  scenarios: {
    protocol_load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 100 }, // Ramp up to 100 VUs over 15s
        { duration: '30s', target: 100 }, // Hold 100 VUs for 30s
        { duration: '10s', target: 0 },  // Ramp down over 10s
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    // Overall HTTP protocol failure rate threshold (< 1%)
    'http_req_failed': ['rate<0.01'],
    // Page Shell GET latency threshold (95% under 800ms)
    'shell_req_duration': ['p(95)<800'],
    // Sentiment Action POST latency threshold (95% under 2500ms)
    'sentiment_action_req_duration': ['p(95)<2500'],
    // Combined total user-perceived load time (95% under 3000ms)
    'total_user_perceived_duration': ['p(95)<3000'],
  },
};

export default function () {
  // Select a movie randomly from the pool of 50 movies
  const movie = MOVIE_POOL[Math.floor(Math.random() * MOVIE_POOL.length)];
  const pageUrl = `https://${TARGET_HOST}/movies/${movie.id}`;

  const iterStart = Date.now();

  // --------------------------------------------------------------------------
  // STEP 1: Fetch Page Shell (GET /movies/:id)
  // --------------------------------------------------------------------------
  const shellRes = http.get(pageUrl, {
    tags: { name: 'GET_movie_shell' },
  });

  shellDuration.add(shellRes.timings.duration);

  check(shellRes, {
    'shell status is 200': (r) => r.status === 200,
    'shell response is non-empty': (r) => r.body && r.body.length > 0,
  });

  // --------------------------------------------------------------------------
  // STEP 2: Execute Client Sentiment Server Action (POST /movies/:id)
  // --------------------------------------------------------------------------
  const actionPayload = JSON.stringify([
    movie.title,
    movie.plot,
    movie.rating,
    [] // comments parameter
  ]);

  const actionHeaders = {
    'Content-Type': 'text/plain;charset=UTF-8',
    'Next-Action': NEXT_ACTION_HASH,
    'Accept': 'text/x-component',
  };

  const actionRes = http.post(pageUrl, actionPayload, {
    headers: actionHeaders,
    tags: { name: 'POST_sentiment_action' },
  });

  sentimentDuration.add(actionRes.timings.duration);

  check(actionRes, {
    'sentiment action status is 200': (r) => r.status === 200,
  });

  // Classify hit vs miss based on latency threshold (~600ms boundary)
  if (actionRes.timings.duration < 600) {
    fastHitsCounter.add(1);
  } else {
    slowMissesCounter.add(1);
  }

  // --------------------------------------------------------------------------
  // STEP 3: Record Total Perceived Latency & Dynamic Think Time
  // --------------------------------------------------------------------------
  const totalDuration = Date.now() - iterStart;
  totalPerceivedDuration.add(totalDuration);

  // Dynamic Think Time: Random pause between 0.5s and 2.5s (simulating real user browsing)
  sleep(Math.random() * 2 + 0.5);
}
