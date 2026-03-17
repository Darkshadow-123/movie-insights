import { Navbar } from "@/app/components/layout";

export default function Loading() {
  return (
    <>
    <Navbar/>
    <div className="loading-section">
      <div className="spinner"></div>
    </div>    
    </>

  );
}
