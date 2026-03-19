-- CreateTable
CREATE TABLE "Syllabus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "courseCode" TEXT,
    "professor" TEXT,
    "semester" TEXT,
    "year" INTEGER,
    "rawText" TEXT NOT NULL,
    "structured" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Deadline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "syllabusId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATETIME,
    "dateText" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "weight" REAL,
    CONSTRAINT "Deadline_syllabusId_fkey" FOREIGN KEY ("syllabusId") REFERENCES "Syllabus" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GradeItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "syllabusId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    "description" TEXT,
    CONSTRAINT "GradeItem_syllabusId_fkey" FOREIGN KEY ("syllabusId") REFERENCES "Syllabus" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
