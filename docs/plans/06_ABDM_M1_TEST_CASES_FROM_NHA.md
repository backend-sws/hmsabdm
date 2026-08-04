# Plan 06 — ABDM M1 Official NHA Test Cases (Excel से Extract)

> **Source:** M1_ABHA_CREATION_AND_VERIFICATION_WITH_APIS_UPDATED_V1_1.xlsx  
> **Designed By:** NHA (National Health Authority)  
> **Module:** ABHA Creation and Verification  
> **Integration:** ABDM Sandbox  
> **Session API:** `https://dev.abdm.gov.in/api/hiecm/gateway/v3/sessions`

---

## Base URLs

| Environment | ABHA APIs | Gateway |
|---|---|---|
| **Sandbox** | `https://abhasbx.abdm.gov.in/abha/api` | `https://dev.abdm.gov.in` |
| **Production** | `https://abha.abdm.gov.in/api/abha` | `https://apis.abdm.gov.in` |

---

## 1. ABHA Creation — Via Aadhaar OTP (Most Important for M1)

**Applicable To:** All  
**APIs Used:**
```
POST /v3/enrollment/request/otp        ← Step 1: Aadhaar OTP bhejo
POST /v3/enrollment/enrol/byAadhaar   ← Step 2: OTP verify + ABHA create
POST /v3/enrollment/request/otp        ← Step 3: Mobile verify (if different)
POST /v3/enrollment/auth/byAbdm       ← Step 4: Mobile OTP verify
GET  /v3/enrollment/enrol/suggestion   ← Step 5: ABHA address suggestions
POST /v3/enrollment/enrol/abha-address ← Step 6: ABHA address set karo
GET  /v3/profile/account              ← Step 7: Final profile fetch
GET  /v3/profile/account/abha-card    ← Step 8: ABHA card (optional)
```

| Test ID | Status | Functionality | Test Case | Expected Result |
|---|---|---|---|---|
| CRT_ABHA_101 | **MANDATORY** | Create ABHA Option | System must provide option to create ABHA through Aadhaar OTP | User has option to create ABHA |
| CRT_ABHA_102 | **MANDATORY** | Consent Collection | Display ABDM-approved consent language, collect user agreement | System records consent for HDMP compliance |
| CRT_ABHA_103 | Optional | Multilingual Consent | Consent in languages other than English | Consent shown in selected language |
| CRT_ABHA_104 | **MANDATORY** | Aadhaar Validation | Allow Aadhaar entry, show error for invalid Aadhaar | Error: "Aadhaar Number is not valid" for non-12-digit |
| CRT_ABHA_105 | **MANDATORY** | Aadhaar OTP Collection | User receives OTP on Aadhaar-linked mobile | 6-digit OTP entry allowed; show masked mobile: `*******XXXX` |
| CRT_ABHA_106 | **MANDATORY** | Resend OTP | Resend button max **2 times**, activated after **60 seconds** | User can resend OTP; system tracks resend count |
| CRT_ABHA_107 | **MANDATORY** | OTP Verification | System must verify OTP | Correct OTP → proceed; Incorrect OTP → show error |
| CRT_ABHA_108 | Optional | Mobile same as Aadhaar | If comm. mobile = Aadhaar-linked mobile → skip mobile OTP | Redirect directly to ABHA creation screen |
| CRT_ABHA_109 | **MANDATORY** | Mobile different from Aadhaar | If comm. mobile ≠ Aadhaar-linked → send mobile OTP | Verify comm. mobile separately |
| CRT_ABHA_112 | **MANDATORY** | Suggested ABHA Address | Show at least **3 suggested** ABHA addresses OR allow custom entry | ABHA address validation rules enforced (see below) |
| CRT_ABHA_113 | **MANDATORY** | Display ABHA Number | Show 14-digit ABHA number + ABHA address after creation | User sees generated ABHA Number and address |
| CRT_ABHA_114 | **MANDATORY** (Private) | ABHA Card View/Download | Show ABHA card via API with: ABHA No, Photo(optional), QR code, DOB, Gender, ABHA Address | User can view/download ABHA card |
| CRT_ABHA_115 | Mandatory (Govt) | ABHA Card Alt | If not generating card, print ABHA No + Address on own card | ABHA details saved in HIMS, linked to patient ID |

### ABHA Address Validation Rules (CRT_ABHA_112):
```
Min length:  8 characters
Max length:  18 characters
Special chars: Only 1 dot (.) AND/OR 1 underscore (_)
Position: Special chars only in middle (not start/end)
Format: Alphanumeric — only letters, only numbers, or combination
```

---

## 2. ABHA Creation — Via Aadhaar Biometric (Optional)

**Applicable To:** All (Optional)  
**APIs Used:** Same as Aadhaar OTP (except biometric verification step)

| Test ID | Status | Test Case |
|---|---|---|
| CRT_ABHA_201 | Optional | Option to create via Aadhaar Biometric (fingerprint/face) |
| CRT_ABHA_202 | Optional | Consent collection |
| CRT_ABHA_203 | Optional | Multilingual consent |
| CRT_ABHA_204 | Optional | Aadhaar entry + validation |
| CRT_ABHA_205 | Optional | Biometric scan (fingerprint/face), verify + error handling |
| CRT_ABHA_206 | Optional | Mobile same as Aadhaar → skip verification |
| CRT_ABHA_207 | Optional | Mobile different → send OTP verify |

---

## 3. ABHA Creation — Via Mobile Only (Most Common for Reception — M1 Focus)

**Applicable To:** All  
**APIs Used:**
```
POST /v3/enrollment/request/otp     ← loginHint: mobile
POST /v3/enrollment/auth/byAbdm    ← OTP verify, ABHA create
GET  /v3/enrollment/enrol/suggestion
POST /v3/enrollment/enrol/abha-address
GET  /v3/profile/account
GET  /v3/profile/account/abha-card
```

| Test ID | Status | Test Case | Expected Result |
|---|---|---|---|
| CRT_ABHA_301 | **MANDATORY** | Option to create via mobile | User has mobile-based ABHA creation option |
| CRT_ABHA_302 | **MANDATORY** | Consent collection | Consent recorded |
| CRT_ABHA_303 | Optional | Multilingual consent | Language support |
| CRT_ABHA_304 | **MANDATORY** | Mobile number entry + validation | 10-digit mobile accepted |
| CRT_ABHA_305 | **MANDATORY** | OTP sent to mobile | 6-digit OTP |
| CRT_ABHA_306 | **MANDATORY** | Resend OTP: max 2 times, after 60 seconds | Resend tracked |
| CRT_ABHA_307 | **MANDATORY** | OTP verification | Correct → proceed; Wrong → error |
| CRT_ABHA_308 | **MANDATORY** | ABHA address suggestion (3+) OR custom | Validation rules enforced |
| CRT_ABHA_309 | **MANDATORY** | Display/Download ABHA card | ABHA number + address visible |

---

## 4. ABHA Creation — Via Driving License / PAN (Optional)

**Applicable To:** Optional for Private, Mandatory for Government  
**APIs Used:**
```
POST /v3/enrollment/request/otp
POST /v3/enrollment/auth/byAbdm
POST /v3/enrollment/enrol/byDocument
```

| Test ID | Status | Test Case |
|---|---|---|
| CRT_ABHA_401 | Optional | Create option via DL/PAN |
| CRT_ABHA_402 | Optional | Consent collection |
| CRT_ABHA_403 | Optional | Mobile number entry |
| CRT_ABHA_404 | Optional | Mobile OTP verification |
| CRT_ABHA_405 | Optional | DL/PAN verification → enrollment number generated |
| CRT_ABHA_406 | Optional | Upload front + back of document |
| CRT_ABHA_407 | Optional | Manual verification by healthcare worker |
| CRT_ABHA_408 | Optional | Display ABHA number after creation |
| CRT_ABHA_410 | Optional | View/Download ABHA card |
| CRT_ABHA_411 | Optional | Print ABHA No + Address if no card |

---

## 5. ABHA Verification — Via Aadhaar OTP

**Applicable To:** All  
**APIs Used:**
```
POST /v3/profile/login/request/otp
POST /v3/profile/login/verify
GET  /v3/profile/account
GET  /v3/profile/account/abha-card
```

| Test ID | Status | Functionality | Expected Result |
|---|---|---|---|
| VRFY_ABHA_101 | **MANDATORY** | ABHA Number verification via Aadhaar OTP | On correct OTP: fetch profile (name, DOB, gender, mobile, address, ABHA No, ABHA address). Name/DOB/Gender = non-editable. Save in HIMS linked to patient ID |
| VRFY_ABHA_102 | **MANDATORY** | ABHA Address verification via Aadhaar OTP | Same as above |

**ABHA Profile APIs (after verification):**
```
GET /v3/phr/web/login/abha/search
POST /v3/phr/web/login/abha/request/otp
POST /v3/phr/web/login/abha/verify
GET /v3/phr/web/login/profile/abha-profile
GET /v3/phr/web/login/profile/abha/phr-card
```

**Non-Editable Fields (After ABHA Verification):**
- ❌ Name (non-editable)
- ❌ Date of Birth (non-editable)
- ❌ Gender (non-editable)

**Editable Fields:**
- ✅ Address, Email, Mobile Number, State, District, City

---

## 6. ABHA Verification — Via Mobile OTP (ABHA-Linked Mobile)

| Test ID | Status | Functionality | APIs |
|---|---|---|---|
| VRFY_ABHA_201 | **MANDATORY** | ABHA Number via mobile OTP | `POST /v3/profile/login/request/otp`, `POST /v3/profile/login/verify` |
| VRFY_ABHA_202 | **MANDATORY** | ABHA Address via mobile OTP | Same APIs |

---

## 7. ABHA Verification — Via Mobile OTP (Aadhaar-Linked Mobile)

| Test ID | Status | Functionality |
|---|---|---|
| VRFY_ABHA_301 | **MANDATORY** | ABHA Number verification via Aadhaar-linked mobile OTP |
| VRFY_ABHA_302 | **MANDATORY** | ABHA Address verification via Aadhaar-linked mobile OTP |

---

## 8. ABHA Verification — Via ABHA OTP / Demographic Auth

| Test ID | Status | Functionality |
|---|---|---|
| VRFY_ABHA_401 | **MANDATORY** | ABHA Number via ABHA OTP |
| VRFY_ABHA_402 | **MANDATORY** | ABHA Address via ABHA OTP |
| VRFY_ABHA_403 | **MANDATORY** | Demographic auth (name + DOB + gender) |
| VRFY_ABHA_404 | **MANDATORY** | Error on wrong demographic |
| VRFY_ABHA_405 | **MANDATORY** | Resend OTP: max 2 times, after 60 seconds |

---

## 9. ABHA Verification — Via Biometric (Government Only)

| Test ID | Status | APIs |
|---|---|---|
| VRFY_ABHA_501 | Optional | ABHA Number via fingerprint/face biometric |
| VRFY_ABHA_502 | Optional | ABHA Address via biometric |

---

## 10. ABHA QR Code Scan

| Test ID | Status | Functionality |
|---|---|---|
| VRFY_ABHA_501 | Optional | EMR/HMIS scans ABHA QR to read profile (name, DOB, gender, mobile) — No APIs needed |

---

## 11. Profile Update (After ABHA Created)

**APIs:**
```
POST /v3/profile/account/request/otp
POST /v3/profile/account/verify
PUT  /v3/profile/account
```

| Test ID | Status | Functionality |
|---|---|---|
| PROF_ABHA_601 | Optional | Mobile number update: new mobile → OTP → old mobile OTP confirm |
| PROF_ABHA_602 | Optional | Photo update via API |
| PROF_ABHA_603 | Optional | Email update via OTP |
| PROF_ABHA_604 | Optional | Re-KYC (Aadhaar OTP) |
| PROF_ABHA_605 | Optional | Delete/Deactivate ABHA (OTP confirm) + Re-activate |

---

## 16. Patient ID Tagging (CRITICAL for HIMS)

| Test ID | Status | Requirement |
|---|---|---|
| TAGGING_UNIQUEPATIENTID_UNIQUEABHANUMBER | **MANDATORY** | One ABHA Number → One unique Patient ID in HIMS. Validate ABHA in DB before creating new patient to avoid duplicate tagging. Applicable for both new and existing patients. |

> ⚠️ **Implementation Note:** `abha_number` column में unique constraint + `firstOrCreate` by `abha_number` pattern use karo.

---

## 17. Share Profile — Scan & Share (QR Flow) — M1 CORE

**Applicable To:** PHR App users  
**API (Incoming Webhook):** `POST https://dev.abdm.gov.in/api/hiecm/patient-share/v3/on-share`

| Test ID | Status | Functionality | Steps | Expected Result |
|---|---|---|---|---|
| SHARE_PATIENT_PROFILE_701 | **MANDATORY** | Scan QR at facility + Share Profile | 1. Login to PHR app<br>2. Scan QR at registration desk<br>3. Profile shown (ABHA No, ABHA Address, Name, Gender, DOB, Mobile, Address)<br>4. Consent shown: *"Your consent to above info shared with [HIP Name] for registration and linking health records"*<br>5. Cancel/Share buttons shown<br>6. Click Share → token generated (valid **30 minutes**)<br>7. Token shown to patient | Profile shared with HIP; Token valid 30 min; Cancel = no share |

> **Token Validity:** 30 minutes (not 15 as we had in plan — update counter_queues.expires_at accordingly)

---

## Mandatory vs Optional Summary

### MANDATORY Tests (Must Pass for M1 Certification):

**ABHA Creation:**
| Group | Test IDs |
|---|---|
| Aadhaar OTP | CRT_ABHA_101, 102, 104, 105, 106, 107, 109, 112, 113, 114/115 |
| Mobile OTP | CRT_ABHA_301-309 |

**ABHA Verification:**
| Group | Test IDs |
|---|---|
| Aadhaar OTP | VRFY_ABHA_101, 102 |
| Mobile OTP | VRFY_ABHA_201, 202, 301, 302 |
| ABHA OTP | VRFY_ABHA_401-405 |

**Tagging & Sharing:**
| Group | Test IDs |
|---|---|
| Patient Tagging | TAGGING_UNIQUEPATIENTID_UNIQUEABHANUMBER |
| Scan & Share | SHARE_PATIENT_PROFILE_701 |

---

## Complete API Reference (All M1 APIs)

```
=== Gateway ===
POST {gateway}/api/hiecm/gateway/v3/sessions                  ← Auth token

=== Enrollment (Creation) ===
POST {abha}/v3/enrollment/request/otp                         ← OTP request (Aadhaar/Mobile)
POST {abha}/v3/enrollment/enrol/byAadhaar                     ← Create via Aadhaar OTP
POST {abha}/v3/enrollment/auth/byAbdm                        ← Verify mobile OTP / Create via mobile
POST {abha}/v3/enrollment/enrol/byDocument                    ← Create via DL/PAN
GET  {abha}/v3/enrollment/enrol/suggestion                    ← ABHA address suggestions
POST {abha}/v3/enrollment/enrol/abha-address                  ← Set ABHA address

=== Profile (Login/Verify) ===
POST {abha}/v3/profile/login/request/otp                     ← Login OTP (existing ABHA)
POST {abha}/v3/profile/login/verify                          ← Verify login OTP
POST {abha}/v3/profile/login/verify/user                     ← User-level verify
GET  {abha}/v3/profile/account                               ← Fetch full profile
GET  {abha}/v3/profile/account/abha-card                     ← ABHA card

=== PHR Login (ABHA Address) ===
GET  {abha}/v3/phr/web/login/abha/search                     ← Search by ABHA address
POST {abha}/v3/phr/web/login/abha/request/otp               ← PHR login OTP
POST {abha}/v3/phr/web/login/abha/verify                     ← PHR login verify
GET  {abha}/v3/phr/web/login/profile/abha-profile            ← PHR profile
GET  {abha}/v3/phr/web/login/profile/abha/phr-card           ← PHR card

=== Profile Update ===
POST {abha}/v3/profile/account/request/otp                   ← Update OTP
POST {abha}/v3/profile/account/verify                        ← Update verify
PUT  {abha}/v3/profile/account                               ← Update profile

=== Certificate (for Aadhaar encryption) ===
GET  {abha}/v3/profile/public/certificate                    ← RSA public key

=== Scan & Share (Webhook) ===
POST {gateway}/api/hiecm/patient-share/v3/on-share           ← YOUR callback URL
```

---

## OTP Rules Summary (From NHA Test Cases)

| Rule | Value |
|---|---|
| Resend OTP max times | **2 times** |
| Resend OTP activation delay | **60 seconds** |
| OTP validity (Sandbox) | **Always 123456** |
| Scan & Share token validity | **30 minutes** |
| OTP digits | **6 digits** |
| Aadhaar format | **12 digits** |
| ABHA number format | **14 digits (91-XXXX-XXXX-XXXX)** |
| ABHA address min length | **8 characters** |
| ABHA address max length | **18 characters** |

---

## Implementation Checklist (Based on NHA Test Cases)

### Phase 1 — ABHA Creation (Mobile OTP Flow — Primary for M1):
- [ ] `generateOtp(mobile)` → call `POST /v3/enrollment/request/otp` with `loginHint: mobile`
- [ ] Show OTP input + countdown 60s → Resend button (max 2 times)
- [ ] `verifyOtp(txnId, otp)` → call `POST /v3/enrollment/auth/byAbdm`
- [ ] Handle multiple ABHA on same mobile (dropdown)
- [ ] Fetch ABHA address suggestions: `GET /v3/enrollment/enrol/suggestion`
- [ ] Allow custom ABHA address (validate min 8, max 18, alphanumeric)
- [ ] Display generated ABHA number (14-digit)
- [ ] Save to DB: `abha_number`, `abha_address` linked to patient

### Phase 2 — ABHA Verification (Existing ABHA Login):
- [ ] `loginRequestOtp(abhaNumber)` → `POST /v3/profile/login/request/otp`
- [ ] `loginVerify(txnId, otp)` → `POST /v3/profile/login/verify`
- [ ] Fetch profile: `GET /v3/profile/account`
- [ ] Non-editable fields: name, DOB, gender
- [ ] Editable: address, email, mobile
- [ ] Save + link to HIMS patient ID

### Phase 3 — Scan & Share:
- [ ] Webhook receiver at `/api/v1/abdm/callback/share-profile`
- [ ] Token validity = **30 minutes** (`expires_at = now()->addMinutes(30)`)
- [ ] `firstOrCreate` patient by `abha_number`
- [ ] `firstOrCreate` counter_queue by `link_token`
- [ ] Reception: find-by-token with expiry check

### Phase 4 — Patient Tagging:
- [ ] Before creating new patient: check if `abha_number` already exists
- [ ] If exists: update existing patient, don't create duplicate
- [ ] One ABHA → One patient ID guaranteed

### Phase 5 — UI Requirements:
- [ ] Consent screen before ABHA creation (ABDM-approved text)
- [ ] Masked mobile display: `*******XXXX`
- [ ] Resend OTP button: disabled until 60s, max 2 clicks
- [ ] ABHA address: show 3 suggestions + custom input option
- [ ] ABHA card: show/download after creation
