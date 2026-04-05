# Fajrak Smart Notification System Upgrade
## Comprehensive Project Plan v1.2 (Final)

**Document Version:** 1.2  
**Date:** 2026-04-05  
**Status:** Approved for Implementation  
**Classification:** Internal  

---

## 1. Executive Summary

### 1.1 Project Overview

This project aims to transform Fajrak's notification system from a basic push notification service into an intelligent, customizable notification platform that enhances user engagement, improves delivery rates, and reduces opt-out rates. The upgrade addresses current limitations including lack of user customization, absent triggered notifications, and limited analytics.

### 1.2 Scope Summary

**In Scope:**
- Customizable notification preferences per type (budget, debt, goals, transactions)
- Automatic triggered notifications based on user actions
- Rich notifications with interactive buttons
- Multiple notification channels
- Quiet hours and rate limiting
- Analytics dashboard
- **NEW**: Advanced Payload Encryption & Privacy Masking
- **NEW**: Local Fallback mechanism for FCM outages

**Out of Scope:**
- In-app messaging system
- Email notifications
- SMS notifications
- Smart scheduling based on user activity

### 1.3 Key Targets

| Metric | Current | Target | Improvement |
|--------|---------|--------|------------|
| Delivery Rate | ~85% | 95% | +10% |
| Open Rate | ~25% | 35% | +10% |
| Opt-out Rate | ~15% | ≤10% | -5% |
| API Response Time | N/A | <200ms | New SLA |
| Security Compliance| N/A | 100% SAMA/GDPR| Compliance |
| Data Privacy | N/A | Masking Enabled | Privacy |

### 1.4 Timeline

**Start Date:** April 6, 2026  
**End Date:** June 15, 2026  
**Duration:** 10 weeks (Revised)  

### 1.5 Budget

**Total Budget:** 24,350 SAR  
**Contingency Reserve:** 2,435 SAR (10%)

### 1.6 Decision Required

This plan requires sponsor approval by **April 6, 2026** to maintain the proposed timeline.

---

## 2. Goals and Objectives

### 2.1 Strategic Objectives

| ID | Objective | KPI | Baseline | Target | Date | Owner |
|---|-----------|-----|---------|--------|------|-------|
| SO-01 | Improve notification delivery | Delivery Rate | 85% | ≥95% | Week 8 | Backend Lead |
| SO-02 | Increase notification engagement | Open Rate | 25% | ≥35% | Week 12 | Product |
| SO-03 | Reduce user complaints | Opt-out Rate | 15% | ≤10% | Week 12 | Product |
| SO-04 | Maintain platform stability | Crash Rate | <1% | <0.5% | Week 8 | QA Lead |
| SO-05 | Ensure Data Privacy | Masking Check | 0% | 100% | Week 2 | Security |
| SO-06 | Compliance Alignment | Audit Pass | 0 | 1 | Week 10 | PM |

### 2.2 Operational Objectives

| ID | Objective | Priority | Dependencies |
|---|-----------|----------|--------------|
| OG-00 | Implement Payload Encryption & Masking | Critical | None |
| OG-01 | Create complete notification preference system | High | None |
| OG-02 | Implement triggered-based automatic notifications | High | OG-01 |
| OG-03 | Add rich notifications with interactive buttons | Medium | OG-01 |
| OG-04 | Create multiple notification channels | Medium | None |
| OG-05 | Implement quiet hours and rate limiting | Low | OG-01 |
| OG-06 | Add analytics and metrics tracking | Low | OG-01 |
| OG-07 | Implement Local Fallback delivery | High | OG-02 |
| OG-08 | Ensure SAMA/GDPR compliance | High | OG-01 |

## 1.3 Milestone Success Criteria

| Milestone | Success Criteria | Measurement Method |
|-----------|----------------|-------------------|
| M1: DB Tables | 4 tables created (incl. History & Prefs) | Migration script execution |
| M2: API Endpoints | 8+ endpoints respond <200ms, JWT encrypted | Performance testing |
| M3: Service Upgrade | All channels registered, Local Fallback works | Manual verification |
| M4: Settings Screen | User can save/load preferences & Masking | User testing |
| M5: Triggers | 4+ triggers fire correctly with de-duplication | Automated tests |
| M6: Edge Functions | Functions respond to test events securely | Integration tests |
| M7: UAT | 0 critical bugs, 100% SAMA Compliance | QA sign-off |
| M8: Production | Release live, no downtime, Encrypted payloads | Monitoring |
| M9: Dashboard | 6+ metrics displayed (incl. Opt-out reasons) | Visual inspection |
| M10: Support | All P1 issues resolved <4h | Support tickets |

---

## 3. Timeline

### 3.1 Project Calendar

| Phase | Start | End | Duration | Key Dates |
|-------|-------|-----|----------|------------|
| Phase 0: Security & Privacy | Apr 6 | Apr 12 | 1 week | Security Foundations |
| Phase 1: Infrastructure | Apr 13| Apr 26 | 2 weeks | DB & API |
| Phase 2: Mobile Implementation | Apr 27| May 10 | 2 weeks | UI & Services |
| Phase 3: Integration & Triggers | May 11| May 24 | 2 weeks | Triggers & Logic |
| Phase 4: Testing & Deployment | May 25| Jun 7  | 2 weeks | QA & Go-Live |
| Phase 5: Analytics & Optimization | Jun 8 | Jun 15 | 1 week | Post-Launch |

### 3.2 Detailed Milestone Schedule

```
WEEK:              1      2      3      4      5      6      7      8      9     10     11     12
DATE:          Apr 6  Apr 13 Apr 20 Apr 27 May 4  May 11 May 18 May 25 Jun 1
                ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
PHASE 1
├── M1: DB      ████────────────────────────────────────────────────────────────────────────────────────
├── M2: API         ████████───────────────────────────────────────────────────────────────────
├── D3a: Privacy    ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
├── D3b: Compliance    ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
├── D3c: Fallback          ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
PHASE 2
├── M3: Service              ████████────────────────────────────────────────────────────────────
├── M4: Screen                    ████████────────────────────────────────────────────────────
PHASE 3
├── M5: Triggers                            ████████──────────────────────────────────────────
├── M6: Edge Func                              ████████────────────────────────────────────
PHASE 4
├── M7: UAT                                      ██████────────────────────────────────────
├── M8: Deploy                                        ██────────────────────────────────────
PHASE 5
├── M9: Dashboard                                         ████████────────────────────────
└── M10: Support                                              ██████████────────────────────────
```

## 2.3 Critical Path

The critical path is: **M1 → M2 → M3 → M5 → M6 → M7 → M8**

Any delay to these milestones will directly impact the end date.

## 2.4 Dependencies Summary

| From | To | Dependency Type | Impact if Delayed |
|------|----|-----------------|-------------------|
| M1 | M2 | Hard | Cannot proceed |
| M2 | M3 | Hard | Cannot build |
| M3 | M4 | Soft | UI delayed |
| M2 | M5 | Hard | Cannot trigger |
| M5 | M6 | Soft | Less features |
| M4 + M6 | M7 | Hard | Cannot test |
| M7 | M8 | Hard | Cannot release |
| M8 | M9 | Soft | Metrics delayed |

---

## 4. Resources

### 4.1 Team Structure

| Role | Name | Availability | Weekly Hours |
|------|------|--------------|---------------|
| Project Manager | TBD | 50% | 20h |
| Backend Lead | TBD | 100% | 40h |
| Mobile Lead | TBD | 100% | 40h |
| QA Lead | TBD | 50% | 20h |
| Backend Developer | TBD | 100% | 40h |
| Mobile Developer | TBD | 100% | 40h |

### 4.2 Budget Breakdown

| Category | Item | Cost (SAR) | % of Total |
|----------|------|-----------|------------|
| **Personnel** | | | |
| | Backend Developer (40h @ 200) | 8,000 | 33% |
| | Mobile Developer (40h @ 200) | 8,000 | 33% |
| | QA Engineer (20h @ 150) | 3,000 | 12% |
| | Project Manager (20h @ 200) | 4,000 | 16% |
| **Infrastructure** | | | |
| | Supabase Pro (3 months) | 600 | 2% |
| | Firebase Cloud Messaging | 0 | 0% |
| | Flutter Local Notifications | 0 | 0% |
| **Tools** | | | |
| | Figma/Adobe XD | 300 | 1% |
| | Jira/Confluence | 450 | 2% |
| | TestFlight | 0 | 0% |
| **TOTAL** | | **24,350** | 100% |

**Note:** Security and compliance enhancements (D3a, D3b, D3c) are included in the existing budget as they are part of Phase 1 infrastructure work.

## 3.3 Budget Contingency

| Reserve Type | Amount | Usage Criteria |
|--------------|--------|---------------|
| Schedule Contingency | 1 week | Critical path delays |
| Budget Contingency | 2,435 SAR | >10% budget overrun |
| Resource Contingency | Buffer | Key person unavailable |

## 3.4 Tools and Environments

| Tool | Purpose | Environment | Access |
|------|--------|-------------|---------|
| Supabase | Database | All | Dev Team |
| Firebase Console | Push Notifications | All | Dev Team |
| Jira | Project Tracking | All | Team |
| Confluence | Documentation | All | Team |
| GitHub | Version Control | All | Dev Team |
| Android Studio | Android Build | Mobile | Mobile Team |
| Xcode | iOS Build | Mobile | Mobile Team |

---

## 5. Risk Assessment

### 5.1 Risk Register

| ID | Risk | Category | Prob. | Impact | Score | Mitigation | Owner | Status |
|---|------|----------|-------|--------|-------|------------|-------|--------|
| R1 | API development delay | Schedule | Medium | High | 6 | Mock data + parallel dev | Backend Lead | Active |
| R2 | FCM compatibility issues | Technical | Low | High | 3 | Early testing + fallback | Mobile Lead | Active |
| R3 | Requirement changes | Scope | Medium | Medium | 4 | Change control + freeze date | PM | Active |
| R4 | Resource unavailability | Resource | Low | High | 3 | Cross-training + buffer | PM | Active |
| R5 | DB migration failure | Technical | Low | Critical | 2 | Backup + tested rollback | Backend | Active |
| R6 | Performance issues | Technical | Medium | Medium | 4 | Early monitoring | Backend | Active |
| R7 | UAT delay | Schedule | Medium | Medium | 4 | Buffer + early start | QA | Active |
| R8 | Privacy Data Leak | Security | Low | Critical | 5 | Encryption + Masking controls | Security | Active |
| R9 | SAMA Non-compliance | Compliance| Low | High | 3 | Legal review + Audit trail | PM | Active |

### 5.2 Risk Matrix

```
IMPACT →
PROB    │  Low   │Medium│ High  │Critical
───────┼────────┼──────┼──────┼───────
High   │   -   │ R3   │ R1,R2 │   R4
Medium │   -   │ R6,R7│  R5,R9│   R8
Low    │   -   │  -   │   -   │   -
```

## 4.3 Contingency Actions

| Risk | Trigger | Contingency Plan | Owner | Escalation |
|------|---------|-----------------|-------|-----------|
| R1 | >3 days delay | Reduce scope: defer non-critical features | PM | Sponsor |
| R2 | FCM failure | Fallback to local notifications | Mobile Lead | Backend Lead |
| R3 | Change request | Follow change control process | PM | Sponsor |
| R4 | Resource leaves | Use contractor or redistribute work | PM | Sponsor |
| R5 | Migration fails | Rollback, fix, retry | Backend Lead | Sponsor |
| R6 | Response >500ms | Add caching, optimize queries | Backend Lead | PM |
| R7 | >2 days delay | Increase testing resources | QA Lead | PM |

---

## 6. Communication Plan

### 6.1 Stakeholder Matrix

| Stakeholder | Interest | Influence | Frequency | Channel |
|------------|----------|-----------|----------|---------|
| Sponsor | Budget, Timeline | High | Bi-weekly | Email |
| Product Manager | Scope, Quality | High | Weekly | Meeting |
| Development Team | Execution | Medium | Daily | Slack |
| QA Team | Quality | Medium | Daily | Slack |
| Customer Support | Post-launch | Low | Bi-weekly | Email |

## 5.2 Communication Cadence

| Meeting | Frequency | Participants | Duration | Owner |
|---------|-----------|--------------|----------|-------|
| Daily Standup | Daily (Mon-Fri) | Core Team | 15 min | PM |
| Sprint Planning | Weekly | Full Team | 60 min | PM |
| Risk Review | Weekly | Leads | 30 min | PM |
| UAT Update | Bi-weekly | QA + Stakeholders | 45 min | QA Lead |
| Demo | End of Phase 4 | All | 60 min | PM |
| Executive Update | Bi-weekly | Sponsor | 30 min | PM |

## 5.3 Escalation Path

```
Level 1: Team Resolution (24h)
    ↓
Level 2: Lead Escalation (24h) - For blockers >1 day
    ↓
Level 3: Manager Escalation (48h) - For timeline/budget impact
    ↓
Level 4: Sponsor (immediate) - For scope change or critical issues
```

## 5.4 Reporting Templates

**Weekly Status Report:**
- Progress: % complete, key achievements
- Risks: Active risks and Mitigations
- Issues: Blockers requiring escalation
- Next Week: Planned activities

**Milestone Sign-off Request:**
- Deliverable: Description
- Criteria: Acceptance criteria met
- Evidence: Test results, screenshots
- Approval: Requested from [Role]

---

# 6. Deliverables and Acceptance Criteria

## 6.1 Deliverable Register

| ID | Deliverable | Phase | Due Date | Owner | Format |
|---|-------------|-------|----------|------|-------|
| D1 | Database Schema | 1 | Apr 8 | Backend | SQL |
| D2 | API Endpoints | 1 | Apr 15 | Backend | OpenAPI Spec |
| D3 | API Documentation | 1 | Apr 19 | Backend | Confluence |
| **D3a** | **Privacy Masking Implementation** | **1** | **Apr 12** | **Backend** | **Dart Code** | **NEW** |
| **D3b** | **Compliance Checklist (SAMA/GDPR)** | **1** | **Apr 15** | **PM** | **Checklist** | **NEW** |
| **D3c** | **FCM Fallback Mechanism** | **1** | **Apr 19** | **Mobile** | **Dart Code** | **NEW** |
| D4 | Notification Service Upgrade | 2 | Apr 27 | Mobile | Dart Code |
| D5 | Settings Screen | 2 | May 3 | Mobile | Flutter |
| D6 | Database Triggers | 3 | May 12 | Backend | SQL |
| D7 | Edge Functions | 3 | May 17 | Backend | TypeScript |
| D8 | Test Suite | 4 | May 21 | QA | Jest/Dart |
| D9 | UAT Report | 4 | May 23 | QA | PDF |
| D10 | Production Release | 4 | May 24 | Leads | Binary |
| D11 | Metrics Dashboard | 5 | May 31 | Backend | Dashboard |
| D12 | Final Report | 5 | Jun 1 | PM | Presentation |

## 6.2 Acceptance Criteria

| Deliverable | Acceptance Criteria | Verification Method | Approver |
|------------|---------------------|-------------------|-------------------|
| D1: DB Tables | - 3 tables created<br>- 0 migration errors<br>- indexes created | Migration execution log | Backend Lead |
| D2: API Endpoints | - 6+ endpoints working<br>- Response <200ms<br>- Authenticated | Performance test | Backend Lead |
| D3: API Docs | - Full coverage<br>- Examples included | Review | PM |
| **D3a: Privacy Masking** | - Financial amounts masked in lock screen<br>- User setting to toggle<br>- Works for all notification types | Manual test | Backend Lead |
| **D3b: Compliance Checklist** | - SAMA requirements reviewed<br>- GDPR requirements reviewed<br>- Data retention policy defined | Review | PM |
| **D3c: FCM Fallback** | - Local notification on app open if FCM fails<br>- Silent fallback mechanism<br>- Error logging | Integration test | Mobile Lead |
| D4: Service | - Compiles successfully<br>- All channels register<br>- Notifications display | Manual test | Mobile Lead |
| D5: Settings Screen | - Save works<br>- Load works<br>- UI complete | User testing | Mobile Lead |
| D6: Triggers | - 4+ triggers fire<br>- Correct data | Automated test | Backend Lead |
| D7: Edge Functions | - Functions respond<br>- Correct output | Integration test | Backend Lead |
| D8: Test Suite | - ≥80% coverage<br>- All tests pass | CI/CD pipeline | QA Lead |
| D9: UAT Report | - All tests passed<br>- 0 critical bugs | QA sign-off | QA Lead |
| D10: Release | - Live in stores<br>- No crash | Monitoring | Sponsor |
| D11: Dashboard | - 5+ metrics<br>- Real-time update | Visual inspection | PM |
| D12: Report | - Lessons learned<br>- Metrics captured | Presentation | Sponsor |

## 6.3 Review Process

| Phase | Review Type | Approver | Criteria |
|-------|------------|---------|----------|
| Phase 1 | Technical Review | Backend Lead | Code review + tests |
| Phase 2 | UX Review | Product | User testing |
| Phase 3 | Integration Review | Backend Lead | End-to-end tests |
| Phase 4 | QA Sign-off | QA Lead | Test results |
| Phase 5 | Sponsor Review | Sponsor | Demo + metrics |

---

## 8. Prioritization Rubric

### 8.1 Scope Change Request Process

```
Change Request Received
         │
         ▼
    Assess Impact
    (Schedule, Budget, Scope)
         │
         ▼
    ┌────┴────┐
    │ Impact  │
    │ <5%    │
    └───┬─────┘
        │
   ┌───┴───┐
   │       │
  Yes     No
   │       │
   ▼       ▼
Approve  Sponsor
         Decision
```

## 7.2 Prioritization Matrix

| Factor | Weight | Score Range | Priority |
|--------|--------|-----------|----------|
| User Value | 30% | 1-10 | P1: Must have |
| Business Value | 25% | 1-10 | P2: Should have |
| Technical Feasibility | 20% | 1-10 | P3: Could have |
| Implementation Effort | 15% | 1-10 | P4: Won't have |
| Risk | 10% | 1-10 | |

## 7.3 Trade-off Decision Framework

| Scenario | Decision | Rationale |
|----------|----------|------------|
| Schedule pressure | Defer P3/P4 features | Protect deadline |
| Budget pressure | Reduce contingency | Reserve for critical |
| Resource pressure | Prioritize critical path | Protect M1-M8 |
| Quality pressure | Extend testing | Never compromise safety |

---

## 9. Dependency Matrix

### 9.1 Internal Dependencies

| Task | Depends On | Type | Description |
|------|------------|-----|------------|
| M2: API | M1: DB | Required | Cannot build without tables |
| M3: Service | M2: API | Required | Needs endpoints |
| M4: Screen | M3: Service | Required | Needs service |
| M5: Triggers | M1: DB | Required | Needs triggers |
| M6: Edge Func | M5: Triggers | Required | Calls triggers |
| M7: UAT | M4, M6 | Required | Needs both |
| M9: Dashboard | M8: Deploy | Required | Needs data |

## 8.2 External Dependencies

| Dependency | Owner | Status | Risk | Mitigation |
|------------|-------|-------|------|------------|
| Supabase Pro subscription | DevOps | Active | Low | Use free tier |
| Firebase credentials | Mobile | Active | Low | Use test project |
| Figma designs | Design | Pending | Medium | Timeline buffer |
| iOS certificates | DevOps | Pending | Medium | 2-week lead |

## 8.3 Alignment with Related Projects

| Project | Dependency | Integration Point |
|---------|------------|------------------|
| Dashboard v2 | None | Separate feature |
| Budget Module | Hard | Notification triggers |
| Debt Module | Hard | Notification triggers |
| Goals Module | Hard | Notification triggers |

---

## 10. Testing and Quality Assurance

### 10.1 Test Strategy

| Test Type | Coverage | Tools | Owner |
|----------|----------|-------|-------|
| Unit Tests | ��80% coverage | Jest/Dart test | Developers |
| Integration Tests | Critical paths | Postman | Backend |
| UI Tests | Key flows | Flutter test | Mobile |
| E2E Tests | User journeys | CI/CD | QA |

## 9.2 Test Execution

| Phase | Type | Duration | Exit Criteria |
|-------|------|----------|--------------|
| Phase 1 | Unit + API | Apr 16-19 | All tests pass |
| Phase 2 | Unit + UI | Apr 30 - May 3 | All tests pass |
| Phase 3 | Integration | May 14-17 | End-to-end works |
| Phase 4 | E2E + UAT | May 18-23 | UAT passed |

## 9.3 Quality Gates

| Gate | Criteria | Escalation |
|------|----------|------------|
| Code Complete | All code written | - |
| Tests Pass | 0 failures | Block release |
| Coverage ≥80% | Coverage met | Warning only |
| Critical Bugs = 0 | No P0 bugs | Block release |
| Major Bugs ≤3 | No P1 bugs | Warning only |

## 9.4 Rollback Procedures

| Scenario | Trigger | Procedure | Owner |
|----------|---------|-----------|-------|
| DB Migration Fails | Error on migration | Run rollback.sql, restart migration | Backend |
| API Not Responding | 5xx errors | Revert to previous version | Backend |
| App Crash on Launch | >1% crash rate | Revert release | Mobile |
| Critical Bug | P0 bug reported | Hotfix or rollback | Leads |

---

## 11. Appendix

### 11.1 Assumptions

| ID | Assumption | Risk if Wrong |
|----|------------|-------------|
| A1 | Team fully available | Schedule delay |
| A2 | FCM credentials valid | Cannot test |
| A3 | Supabase Pro available | Use free tier |
| A4 | No OS major updates | Additional testing |
| A5 | Budget approved as-is | Scope reduction |
| A6 | No security incidents | Emergency response |

## 10.2 Decisions Log

| ID | Decision | Rationale | Date |
|----|----------|---------|------|
| DEC-01 | Use FCM for all push | Industry standard, free tier sufficient | 2026-04-05 |
| DEC-02 | Supabase for database | Already in use, no migration needed | 2026-04-05 |
| DEC-03 | 80% threshold for budget | Industry standard for alerts | 2026-04-05 |
| DEC-04 | No in-app messaging in v1 | Out of scope for v1 | 2026-04-05 |
| DEC-05 | 8 notification channels | Balanced complexity/coverage | 2026-04-05 |

## 10.3 Glossary

| Term | Definition |
|------|-----------|
| Channel | Category for notification grouping |
| Trigger | Event that initiates notification |
| Quiet Hours | Time period when no notifications sent |
| Rate Limit | Maximum notifications per time period |
| Rich Notification | Notification with images/buttons |
| Delivery Rate | % of notifications delivered |
| Open Rate | % of delivered notifications opened |
| Opt-out Rate | % of users who disabled notifications |

---

# 11. Security and Compliance (v1.2 Addition)

## 11.1 Privacy Protection

| Requirement | Implementation | Status |
|-------------|-----------------|--------|
| Data Masking | Mask financial amounts in lock screen notifications | D3a |
| User Control | Setting to toggle sensitive data visibility | D3a |
| PII Handling | No PII stored in notification logs | D3a |

## 11.2 Regulatory Compliance

| Regulation | Requirements | Implementation |
|------------|--------------|----------------|
| GDPR | Data protection, consent, retention | D3b checklist |
| PDPL (Saudi) | Local storage requirements | D3b checklist |
| SAMA | Financial data handling | D3b checklist |

## 11.3 Service Reliability

| Mechanism | Purpose | Deliverable |
|-----------|---------|-------------|
| FCM Fallback | Local notification when FCM fails | D3c |
| Token Rotation | Handle FCM token refresh | Existing (onTokenRefresh) |
| Error Logging | Track delivery failures | D3c |

---

## 12. Approval

| Role | Name | Signature | Date |
|------|------|----------|------|
| Project Manager | _________________ | _________ | _________ |
| Backend Lead | _________________ | _________ | _________ |
| Mobile Lead | _________________ | _________ | _________ |
| QA Lead | _________________ | _________ | _________ |
| Sponsor | _________________ | _________ | _________ |

---

*Document Version: 1.2*  
*Last Updated: 2026-04-05*  
*Next Review: April 6, 2026*