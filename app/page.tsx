import { SearchForm } from "./components/SearchForm";

export default function Home() {
  return (
    <div className="home-page">
      <div className="home-logo">
        <span className="home-logo-icon">Brew</span>
        <span className="home-logo-text">AI Movie Insights</span>
      </div>
      
      <h1 className="home-headline">
        Discover Your<br />Favorite Movies
      </h1>
      <p className="home-subheadline">
        Get comprehensive insights, cast details, and AI-powered sentiment analysis for any film.
      </p>
      <div className="home-search-container" id="search">
      <SearchForm />
      </div>
    </div>
  );
}
