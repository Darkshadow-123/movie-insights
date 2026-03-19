"use client";  
   
import { useActionState } from 'react';  
import { searchMovie } from '@/app/actions/searchAction';  
   
export function SearchForm() {  
  const [state, formAction, isPending] = useActionState(searchMovie, null);  
   
  return (  
    <div className="home-search-container" id="search">  
      <form action={formAction} className="home-search-form">  
        <input  
          type="text"  
          name="searchQuery"  
          className="home-search-input"  
          placeholder="Enter IMDb ID (e.g., tt0133093)"  
          disabled={isPending}  
          required  
        />  
        <button type="submit" className="home-search-btn" disabled={isPending}>  
          {isPending ? "Searching..." : "Search"}  
        </button>  
      </form>  
      {state?.error && (  
        <p className="error-message" style={{ marginTop: "16px" }}>  
          {state.error}  
        </p>  
      )}  
    </div>  
  );  
}
