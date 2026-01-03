# Hong Kong School Admission System - API Documentation

**Base URL**: `http://localhost:8080/api/v1`

**Authentication**:
Most endpoints require a JWT token.
- **Header**: `Authorization: Bearer <your_token>`

---

## 1. Authentication (Auth)

### 1.1 Send OTP (Login Request)
- **Endpoint**: `POST /auth/login`
- **Description**: Sends a verification code to the user's phone or email. (Currently mocks sending "123456").
- **Request Body**:
  ```json
  {
    "identifier": "parent@example.com" // or phone number
  }
  ```
- **Response**:
  ```json
  {
    "message": "OTP sent successfully...",
    "identifier": "parent@example.com"
  }
  ```

### 1.2 Verify OTP
- **Endpoint**: `POST /auth/verify`
- **Description**: Verifies the code and returns a JWT token.
- **Request Body**:
  ```json
  {
    "identifier": "parent@example.com",
    "code": "123456"
  }
  ```
- **Response**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": 1,
      "identifier": "parent@example.com",
      "role": "parent"
    }
  }
  ```

---

## 2. Child Profiles (Children)
*Requires Auth Header*

### 2.1 Create Child Profile
- **Endpoint**: `POST /children`
- **Request Body**:
  ```json
  {
    "name": "Alice",
    "current_grade": "P6",
    "target_grade": "S1", // Optional: Target grade for admission (e.g., S1, P1, K1). Inferred from current_grade if empty.
    "gender": "F", // "M" or "F"
    "target_districts": "Kowloon City, Wan Chai",
    "resume_text": "Grade 8 Piano, Math Olympiad Silver" // Optional
  }
  ```
- **Response**: `201 Created` with the created child object.

### 2.2 Analyze Child Profile (AI)
- **Endpoint**: `POST /children/analyze`
- **Description**: Parses unstructured text to extract child profile details. (Currently uses basic keyword matching).
- **Request Body**:
  ```json
  {
    "text": "My daughter Alice is in P6, looking for schools in Kowloon City. She plays piano."
  }
  ```
- **Response**:
  ```json
  {
    "name": "Alice",
    "gender": "F",
    "current_grade": "P6",
    "target_districts": "Kowloon City",
    "resume_text": "My daughter Alice is in P6, looking for schools in Kowloon City. She plays piano."
  }
  ```

### 2.3 List Children
- **Endpoint**: `GET /children`
- **Response**: Array of child profiles belonging to the current user.

### 2.3 Update Child
- **Endpoint**: `PUT /children/:id`
- **Request Body**: Same as Create. Partial updates supported.

### 2.4 Delete Child
- **Endpoint**: `DELETE /children/:id`

### 2.5 Get School Matches (Core Feature)
- **Endpoint**: `GET /children/:id/matches`
- **Description**: Returns a list of schools matching the child's gender, target grade (school level), and target districts.
  - **Logic**:
    1. **Strict Match**: Filters by Gender (e.g., Boys/Co-ed for 'M') and Grade (e.g., Secondary for 'S1'). If `target_grade` is empty, it is inferred from `current_grade`.
    2. **District Match**: Filters by `target_districts` if set.
    3. **Expansion Strategy**: If fewer than 5 strict matches are found in the target districts, the search automatically expands to **All Districts**.
       - For Secondary schools, it prioritizes **Band 1** and ranked schools.
       - For others, it prioritizes by name.
- **Query Parameters**:
  - `page`: Page number (default: 1).
  - `limit`: Number of items per page (default: 20).
- **Response**:
  ```json
  {
    "child": "Alice",
    "matches": [
      {
        "id": 1,
        "name_en": "Pooi To Middle School",
        "category": "Secondary (Aided)",
        "district": "Kowloon City",
        "gender": "Girls",
        "banding": "Band 1",
        ...
      }
    ],
    "analysis": "Found only 2 matches in target districts. Expanded search to include 18 more schools. Showing 1-20 of 20.",
    "total_count": 2, // Count of STRICT matches (in target district)
    "page": 1,
    "limit": 20
  }
  ```

---

## 3. Schools
*Public Access for Read, Admin for Write (currently open for dev)*

### 3.1 List Schools (Search)
- **Endpoint**: `GET /schools`
- **Query Parameters**:
  - `district`: e.g., "kowloon_city" (Use metadata keys)
  - `category`: e.g., "Aided", "DSS"
  - `banding`: "Band 1", "Band 2", "Band 3"
  - `gender`: "boys", "girls", "co_ed" (Use metadata keys)
  - `religion`: e.g., "Christianity"
  - `name`: Search by name (English or Chinese)
- **Example**: `GET /schools?district=kowloon_city&gender=girls`
- **Response**: Array of School objects.

### 3.2 Get School Details
- **Endpoint**: `GET /schools/:id`
- **Response**: Single School object.

### 3.3 Create School (Admin)
- **Endpoint**: `POST /schools`
- **Request Body**:
  ```json
  {
    "name_en": "Example School",
    "name_cn": "示例中学",
    "district": "Wan Chai",
    "gender": "Co-ed",
    "banding": "Band 1",
    "category": "Aided",
    "website_home": "http://...",
    "website_admission": "http://..."
  }
  ```

---

## 4. Application Tracking
*Requires Auth Header*

### 4.1 Create Application (Track a School)
- **Endpoint**: `POST /applications`
- **Request Body**:
  ```json
  {
    "child_id": 1,
    "school_id": 5,
    "status": "interested", // interested, applied, interview, offer, rejected
    "notes": "Need to check deadline"
  }
  ```

### 4.2 List Applications
- **Endpoint**: `GET /applications`
- **Query Parameter**: `child_id` (Required)
- **Response**: Array of Application objects (with `school` details preloaded).

### 4.3 Update Application Status
- **Endpoint**: `PUT /applications/:id`
- **Request Body**:
  ```json
  {
    "status": "applied",
    "notes": "Submitted online form on Jan 3rd"
  }
  ```

---

## 5. AI & Crawler (Advanced)

### 5.1 Chat with AI
- **Endpoint**: `POST /chat`
- **Request Body**:
  ```json
  {
    "message": "Find me a Band 1 school in Shatin for my son."
  }
  ```
- **Response**:
  ```json
  {
    "response": "Based on your request..."
  }
  ```

### 5.2 Upload Resume (Text)
- **Endpoint**: `POST /chat/resume`
- **Request Body**:
  ```json
  {
    "resume_text": "Student Name: Bob..."
  }
  ```

### 5.3 Trigger Crawler (Admin)
- **Endpoint**: `POST /crawl`
- **Query Parameters**: 
  - `action`: `discover` (Crawls lists of Kindergartens, Primary, and Secondary schools from schooland.hk)
  - `school_id`: (Optional, crawls admission details for specific school)
- **Response**: Crawl status report.

---

## 6. Metadata (Public)

### 6.1 Get Metadata (i18n)
- **Endpoint**: `GET /metadata`
- **Description**: Returns standardized metadata keys and their localized values (English, Traditional Chinese, Simplified Chinese) for frontend rendering.
- **Response**:
  ```json
  {
    "districts": [
      {
        "key": "kowloon_city",
        "en": "Kowloon City",
        "tc": "九龍城",
        "sc": "九龙城"
      },
      ...
    ],
    "genders": [
      {
        "key": "boys",
        "en": "Boys",
        "tc": "男校",
        "sc": "男校"
      },
      ...
    ],
    "categories": [
      {
        "key": "secondary",
        "en": "Secondary",
        "tc": "中學",
        "sc": "中学"
      },
      ...
    ]
  }
  ```
