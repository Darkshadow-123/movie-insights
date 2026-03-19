"use client";  
   
import { useState, useEffect, useRef } from "react";  
import Link from "next/link";  
import { useActionState } from 'react';  
import { searchMovie } from '@/app/actions/searchAction';  
import styles from "./Navbar.module.css";  
   
export function Navbar() {  
  const [visible, setVisible] = useState(true);  
  const lastScrollY = useRef(0);  
    
  const [state, formAction, isPending] = useActionState(searchMovie, null);  
   
  useEffect(() => {  
    const handleScroll = () => {  
      const currentScrollY = window.scrollY;  
        
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {  
        setVisible(false);  
      } else {  
        setVisible(true);  
      }  
        
      lastScrollY.current = currentScrollY;  
    };  
   
    window.addEventListener("scroll", handleScroll, { passive: true });  
    return () => window.removeEventListener("scroll", handleScroll);  
  }, []); 
 
  useEffect(() => {  
    if (state?.error) {  
      alert(state.error);  
    }  
  }, [state]);  
   
  return (  
    <nav className={`${styles.navbar} ${visible ? styles.visible : styles.hidden}`}>  
      <div className={styles.container}>  
        <Link href="/" className={styles.logo}>  
          <span className={styles.logoIcon}>Brew</span>  
          <span className={styles.logoText}>AI Movie Insights</span>  
        </Link>  
   
        <form action={formAction} className={styles.searchForm}>  
          <input  
            type="text"  
            name="searchQuery"  
            className={styles.searchInput}  
            placeholder="Enter IMDb ID (e.g., tt0133093)"  
            disabled={isPending}  
            required  
          />  
          <button type="submit" className={styles.searchBtn} disabled={isPending}>  
            {isPending ? "Searching..." : "Search"}  
          </button>  
        </form>  
      </div>  
    </nav>  
  );  
}