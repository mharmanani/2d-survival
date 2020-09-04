--- load with 
--- sqlite3 database.db < schema.sql

CREATE TABLE users (
	usrid VARCHAR(20) PRIMARY KEY NOT NULL,
	password VARCHAR(50) NOT NULL
);

CREATE TABLE playerStats (
	usrid VARCHAR(20) PRIMARY KEY NOT NULL,
	num_kills INTEGER NOT NULL
);

CREATE TABLE highscores (
	usrid VARCHAR(20) PRIMARY KEY NOT NULL,
	bestRound INTEGER NOT NULL
);