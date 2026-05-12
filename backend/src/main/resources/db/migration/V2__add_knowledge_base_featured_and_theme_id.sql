ALTER TABLE knowledge_bases
ADD COLUMN featured BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE knowledge_bases
ADD COLUMN theme_id VARCHAR(64);
