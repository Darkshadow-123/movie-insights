"use client";

import { useState } from "react";
import styles from "./Tabs.module.css";

interface TabsProps {
  tabs: { id: string; label: string; content: React.ReactNode }[];
  defaultTab?: string; // Optional - uses first tab if not provided
}

export function Tabs({ tabs, defaultTab }: TabsProps) {
  // Initialize with provided defaultTab or fall back to first tab's ID
  // Using optional chaining to safely access first tab
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <div>
      <div className={styles.tabList}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.tabContent}>
        {/* Find and render content for active tab using optional chaining for safety */}
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}
