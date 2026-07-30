# **Bench (MVP)**

**Vision:** To become Argentina's definitive source of truth for salaries and workplace culture by providing professional transparency in a high-inflation environment.

---

## **1\. Unique Value Proposition (UVP)**

**"Verified professional anonymity with a real-time purchasing power engine."**

Unlike global platforms, **Bench** is built specifically for the Argentine context. Glassdoor lacks local economic scope, LinkedIn incentivizes performative positivity, and Reddit lacks anonymity. Bench provides the inflation-adjusted data workers need to negotiate effectively, accessible only to verified professionals. The social network proposal is very similar to Blind.

---

## **2\. Core User Stories**

### **A. Identity & Trust**

* **Sign Up / Login:** As a user, I can create an account via email/password or Google OAuth to maintain a persistent credential and access my history.  
* **Work Email Verification:** As a user, I must verify a current work email (e.g., @globant.com) to prove my employment. The system sends a one-time code and, upon confirmation, persists only the company domain as a badge on my profile. **The full email is discarded immediately after verification.**  
* **Job Change / Re-verification:** As a user, I can update my work email when I change jobs. My previous salary entries remain tagged to the former company, preserving historical data while updating my current "Company Badge."

  ### **B. The Inflation Engine (Core Differentiator)**

* **Salary Input:** As a user, I can log my net monthly salary (ARS), the month/year of payment, my role, and my seniority level.  
* **Real-Wage Visualization:** I can view my salary history converted to **USD Blue** and adjusted by **IPC (Consumer Price Index)** to track purchasing power fluctuations month-over-month.  
* **Market Benchmark:** I can compare my adjusted salary against the market average. To protect anonymity, benchmark data is only visible once a cohort (role \+ seniority \+ company size) reaches a minimum of **3 entries (k-anonymity)**.

  ### **C. The Grapevine (Company Feed) — *Phase 1.1***

* **Company Wall:** Verified users can post anonymous "insider" info (bonuses, culture, tech stack) on a company-specific feed.  
* **Upvote/Downvote:** Users can vote on posts to surface relevant signals and bury noise.  
* *Note: This feature is scoped for a fast-follow launch to avoid the legal and moderation complexities of content during the initial data-validation phase.*  
  ---

  ## **3\. Technical Specifications**

| Area | Detail |
| :---- | :---- |
| **Authentication** | Email \+ Password or Google OAuth (Standard session management). |
| **Verification** | One-time code via work email; only the domain is persisted. |
| **Privacy Model** | **Architectural Separation:** Auth credentials and activity data (posts, salaries) reside in separate schemas with no direct foreign keys. |
| **Anonymity Threshold** | Minimum of 3 entries per cohort required before displaying benchmark data. |
| **Data Sources** | **IPC:** INDEC (via third-party aggregators). **USD Blue:** Dolarito / Ámbito APIs. |
| **Frontend** | Mobile-first Responsive Web (PWA). |
| **Backend** | PostgreSQL (TimescaleDB extension for time-series salary data). |

  ---

  ## **4\. Scope Management**

  ### **🚫 Out of Scope (Not for MVP)**

* Direct Messaging (1-to-1).  
* Document uploading (e.g., PDF payslips).  
* Public user profiles or bios.  
* Global market support (Exclusively Argentina).  
* Social Feed / Grapevine (Deferred to Phase 1.1).  
  ---

  ## **5\. Success Metrics (KPIs)**

| KPI | Target |
| :---- | :---- |
| **Trust** | 100 verified users from at least 10 Tier-1 companies (Meli, Globant, JPMC, etc.). |
| **Density** | At least 5 active salary entries per major job title (e.g., "Sr. Backend Dev"). |
| **Contribution Rate** | 40%+ of verified users submit at least one salary entry within their first week. |
| **Retention** | 30% of users return the day monthly IPC data is released. |

  ---

  ## **6\. Go-to-Market (GTM) Strategy**

To solve the "Cold-Start" problem (users needing data to contribute data):

1. **Seed with Public Data:** Pre-populate the platform with aggregated salary ranges from Sysarmy's annual survey and Openqube to provide immediate initial value.  
2. **Community-First Launch:** Target the Sysarmy Slack/Discord and Argentine tech Twitter communities as the primary distribution channels.  
3. **Standalone Hook:** Market the IPC/Blue salary calculator as a free utility. Use the traffic from the calculator to convert visitors into verified contributors.  
   
