SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'game')
BEGIN
  EXEC('CREATE SCHEMA game');
END;

IF OBJECT_ID('game.FuelScores', 'U') IS NOT NULL DROP TABLE game.FuelScores;
IF OBJECT_ID('game.FuelBadges', 'U') IS NOT NULL DROP TABLE game.FuelBadges;
IF OBJECT_ID('game.FuelMonthlyStats', 'U') IS NOT NULL DROP TABLE game.FuelMonthlyStats;
IF OBJECT_ID('game.FuelBadgeDefinitions', 'U') IS NOT NULL DROP TABLE game.FuelBadgeDefinitions;
IF OBJECT_ID('game.FuelSeasons', 'U') IS NOT NULL DROP TABLE game.FuelSeasons;
IF OBJECT_ID('game.Users', 'U')       IS NOT NULL DROP TABLE game.Users;

CREATE TABLE game.Users (
  Email             NVARCHAR(100)  NOT NULL PRIMARY KEY,
  DriverId          NVARCHAR(50)   NOT NULL,
  Name              NVARCHAR(100)  NOT NULL
);

CREATE UNIQUE INDEX UQ_Users_DriverId ON game.Users (Email);

CREATE TABLE game.FuelMonthlyStats (
  DriverId          NVARCHAR(50)   NOT NULL,
  FuelType          VARCHAR(10)    NOT NULL,
  MonthKey          CHAR(7)        NOT NULL,
  MonthlyKm         INT            NULL,
  MonthlyLitres     DECIMAL(10,2)  NULL,
  AvgL100Km         DECIMAL(5,2)   NULL,
  MonthlyAmountEUR  DECIMAL(10,2)  NULL,
  FillCount         INT            NOT NULL,
  ExcludedFills     INT            NOT NULL CONSTRAINT DF_FuelMonthlyStats_ExcludedFills DEFAULT 0,
  BaselineL100      DECIMAL(6,4)   NULL,
  BaselineKm        INT            NULL,
  BaselineFills     DECIMAL(3,1)   NULL,
  BaselineAmountEUR DECIMAL(10,4)  NULL,
  DeltaPctL100      DECIMAL(7,2)   NULL,
  DeltaPctKm        DECIMAL(7,2)   NULL,
  DeltaPctAmount    DECIMAL(7,2)   NULL,
  DeltaFillCount    INT            NULL,
  IsOutlier         BIT            NOT NULL CONSTRAINT DF_FuelMonthlyStats_IsOutlier DEFAULT 0,
  OutlierReason     VARCHAR(50)    NULL,
  ComputedAt        DATETIME2      NOT NULL CONSTRAINT DF_FuelMonthlyStats_ComputedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_FuelMonthlyStats PRIMARY KEY (DriverId, FuelType, MonthKey),
  CONSTRAINT CK_FuelMonthlyStats_FuelType CHECK (FuelType IN ('Essence', 'Diesel'))
);

CREATE TABLE game.FuelSeasons (
  SeasonId          INT            IDENTITY(1,1) PRIMARY KEY,
  Name              NVARCHAR(50)   NOT NULL,
  StartMonth        CHAR(7)        NOT NULL,
  EndMonth          CHAR(7)        NOT NULL,
  IsActive          BIT            NOT NULL CONSTRAINT DF_FuelSeasons_IsActive DEFAULT 0,
  CreatedAt         DATETIME2      NOT NULL CONSTRAINT DF_FuelSeasons_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_FuelSeasons_MonthOrder CHECK (StartMonth <= EndMonth)
);

CREATE TABLE game.FuelScores (
  DriverId          NVARCHAR(50)   NOT NULL,
  FuelType          VARCHAR(10)    NOT NULL,
  MonthKey          CHAR(7)        NOT NULL,
  SeasonId          INT            NULL,
  PtsL100           INT            NOT NULL CONSTRAINT DF_FuelScores_PtsL100 DEFAULT 0,
  PtsTrend          INT            NOT NULL CONSTRAINT DF_FuelScores_PtsTrend DEFAULT 0,
  RawScore          INT            NOT NULL CONSTRAINT DF_FuelScores_RawScore DEFAULT 0,
  StreakMonths      INT            NOT NULL CONSTRAINT DF_FuelScores_StreakMonths DEFAULT 0,
  Multiplier        DECIMAL(4,2)   NOT NULL CONSTRAINT DF_FuelScores_Multiplier DEFAULT 1.0,
  FinalScore        INT            NOT NULL CONSTRAINT DF_FuelScores_FinalScore DEFAULT 0,
  WarmupPeriod      BIT            NOT NULL CONSTRAINT DF_FuelScores_WarmupPeriod DEFAULT 0,
  IsOutlier         BIT            NOT NULL CONSTRAINT DF_FuelScores_IsOutlier DEFAULT 0,
  ComputedAt        DATETIME2      NOT NULL CONSTRAINT DF_FuelScores_ComputedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_FuelScores PRIMARY KEY (DriverId, FuelType, MonthKey),
  CONSTRAINT CK_FuelScores_FuelType CHECK (FuelType IN ('Essence', 'Diesel')),
  CONSTRAINT FK_FuelScores_Season FOREIGN KEY (SeasonId) REFERENCES game.FuelSeasons (SeasonId)
);

CREATE INDEX IX_FuelScores_Season_Leaderboard ON game.FuelScores (SeasonId, FinalScore DESC);

CREATE TABLE game.FuelBadgeDefinitions (
  BadgeCode         VARCHAR(30)    NOT NULL PRIMARY KEY,
  Name              NVARCHAR(50)   NOT NULL,
  Description       NVARCHAR(200)  NOT NULL,
  Icon              NVARCHAR(10)   NOT NULL,
  SortOrder         INT            NOT NULL CONSTRAINT DF_FuelBadgeDefinitions_SortOrder DEFAULT 0
);

CREATE TABLE game.FuelBadges (
  Id                INT            IDENTITY(1,1) PRIMARY KEY,
  DriverId          NVARCHAR(50)   NOT NULL,
  BadgeCode         VARCHAR(30)    NOT NULL,
  EarnedMonth       CHAR(7)        NOT NULL,
  EarnedAt          DATETIME2      NOT NULL CONSTRAINT DF_FuelBadges_EarnedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_FuelBadges_Driver_Badge UNIQUE (DriverId, BadgeCode),
  CONSTRAINT FK_FuelBadges_BadgeDefinition FOREIGN KEY (BadgeCode) REFERENCES game.FuelBadgeDefinitions (BadgeCode)
);

CREATE INDEX IX_FuelBadges_Driver ON game.FuelBadges (DriverId);

IF NOT EXISTS (
  SELECT 1 FROM game.FuelSeasons WHERE Name = N'Saison 1'
)
BEGIN
  INSERT INTO game.FuelSeasons (Name, StartMonth, EndMonth, IsActive)
  VALUES (N'Saison 1', '2026-01', '2026-12', 1);
END;

COMMIT TRANSACTION;
