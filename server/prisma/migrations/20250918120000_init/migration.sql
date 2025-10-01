-- Create required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create Enums
CREATE TYPE "RobotType" AS ENUM ('URSIM_CB3_3_15_8');
CREATE TYPE "RequestStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'REJECTED');

-- Create Tables
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT,
  "admin" BOOLEAN NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
ALTER TABLE "Session" ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("id");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Robot" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "type" "RobotType" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE "Robot" ADD CONSTRAINT "Robot_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "Robot_name_key" ON "Robot"("name");

CREATE TABLE "Availability" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "robotId" TEXT NOT NULL,
  "start" TIMESTAMP(3) NOT NULL,
  "end" TIMESTAMP(3) NOT NULL
);
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_pkey" PRIMARY KEY ("id");
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_robotId_fkey"
  FOREIGN KEY ("robotId") REFERENCES "Robot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RobotSession" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "robotId" TEXT NOT NULL,
  "start" TIMESTAMP(3) NOT NULL,
  "end" TIMESTAMP(3) NOT NULL
);
ALTER TABLE "RobotSession" ADD CONSTRAINT "RobotSession_pkey" PRIMARY KEY ("id");
CREATE INDEX "RobotSession_robotId_idx" ON "RobotSession"("robotId");
ALTER TABLE "RobotSession" ADD CONSTRAINT "RobotSession_robotId_fkey"
  FOREIGN KEY ("robotId") REFERENCES "Robot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RobotSessionRequest" (
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "RequestStatus" NOT NULL DEFAULT 'REQUESTED'
);
CREATE UNIQUE INDEX "RobotSessionRequest_sessionId_userId_key" ON "RobotSessionRequest"("sessionId","userId");
ALTER TABLE "RobotSessionRequest" ADD CONSTRAINT "RobotSessionRequest_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "RobotSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RobotSessionRequest" ADD CONSTRAINT "RobotSessionRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

