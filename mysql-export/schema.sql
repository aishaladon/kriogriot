-- Krio Griot -> MySQL schema
-- Generated from the Airtable base app8m4USNF5opdXBp

CREATE DATABASE IF NOT EXISTS `kriogriot` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `kriogriot`;

-- People
CREATE TABLE IF NOT EXISTS `people` (
  `record_id` VARCHAR(20) NOT NULL,
  `full_name` VARCHAR(500) NULL,
  `person_id` INT NULL,
  `birth_name` VARCHAR(500) NULL,
  `also_known_as` VARCHAR(500) NULL,
  `sex` VARCHAR(500) NULL,
  `race_ethnicity_as_recorded` VARCHAR(500) NULL,
  `birth_date` VARCHAR(500) NULL,
  `birth_place` VARCHAR(500) NULL,
  `death_date` VARCHAR(500) NULL,
  `death_place` VARCHAR(500) NULL,
  `burial_place` VARCHAR(500) NULL,
  `generation_number` VARCHAR(500) NULL,
  `relation_to_self` VARCHAR(500) NULL,
  `line` VARCHAR(500) NULL,
  `collections` TEXT NULL,
  `research_questions` TEXT NULL,
  `dna_tests` TEXT NULL,
  `ancestry_profile_url` VARCHAR(500) NULL,
  `familysearch_id` VARCHAR(500) NULL,
  `geni_profile_url` VARCHAR(500) NULL,
  `photo` TEXT NULL,
  `notes` TEXT NULL,
  `sources` TEXT NULL,
  `evidence_analysis` TEXT NULL,
  `name_from_collections` TEXT NULL,
  `research_question_from_research_questions` TEXT NULL,
  `name_from_dna_tests` TEXT NULL,
  `dna_matches` TEXT NULL,
  `archives` TEXT NULL,
  `donors` TEXT NULL,
  `research_log` TEXT NULL,
  `photo_url` VARCHAR(500) NULL,
  PRIMARY KEY (`record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Research Questions
CREATE TABLE IF NOT EXISTS `research_questions` (
  `record_id` VARCHAR(20) NOT NULL,
  `research_question` TEXT NULL,
  `question_id` DOUBLE NULL,
  `research_type` VARCHAR(500) NULL,
  `status` VARCHAR(500) NULL,
  `priority` VARCHAR(500) NULL,
  `date_opened` DATE NULL,
  `date_resolved` DATE NULL,
  `current_conclusion` TEXT NULL,
  `gaps_identified` TEXT NULL,
  `conflicting_evidence` TEXT NULL,
  `next_action` VARCHAR(500) NULL,
  `reasonably_exhaustive_search_done` TINYINT(1) NULL,
  `all_evidence_cited` TINYINT(1) NULL,
  `conflicts_resolved` TINYINT(1) NULL,
  `written_conclusion_exists` TINYINT(1) NULL,
  `collections_text` VARCHAR(500) NULL,
  `sources_consulted` VARCHAR(500) NULL,
  `evidence_items` VARCHAR(500) NULL,
  `dna_tests_text` VARCHAR(500) NULL,
  `people` TEXT NULL,
  `sources` TEXT NULL,
  `evidence_analysis` TEXT NULL,
  `dna_testing` TEXT NULL,
  `dna_matches` TEXT NULL,
  `has_evidence` TEXT NULL,
  `research_log` TEXT NULL,
  PRIMARY KEY (`record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sources
CREATE TABLE IF NOT EXISTS `sources` (
  `record_id` VARCHAR(20) NOT NULL,
  `name` VARCHAR(500) NULL,
  `source_id` INT NULL,
  `source_type` VARCHAR(500) NULL,
  `record_type` TEXT NULL,
  `repository` VARCHAR(500) NULL,
  `url` VARCHAR(500) NULL,
  `physical_location` VARCHAR(500) NULL,
  `date_of_source` VARCHAR(500) NULL,
  `date_accessed` DATE NULL,
  `full_citation` TEXT NULL,
  `short_citation` VARCHAR(500) NULL,
  `search_status` VARCHAR(500) NULL,
  `search_notes` TEXT NULL,
  `collections` TEXT NULL,
  `research_questions` TEXT NULL,
  `people_mentioned` TEXT NULL,
  `attachments` TEXT NULL,
  `name_from_collections` TEXT NULL,
  `research_question_from_research_questions` TEXT NULL,
  `full_name_from_people_mentioned` TEXT NULL,
  `evidence_analysis` TEXT NULL,
  `has_citation` TEXT NULL,
  `research_log` TEXT NULL,
  `source_file_url` VARCHAR(500) NULL,
  PRIMARY KEY (`record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Evidence Analysis
CREATE TABLE IF NOT EXISTS `evidence_analysis` (
  `record_id` VARCHAR(20) NOT NULL,
  `evidence_summary` VARCHAR(500) NULL,
  `evidence_id` INT NULL,
  `sources` TEXT NULL,
  `research_questions` TEXT NULL,
  `people` TEXT NULL,
  `information_type` VARCHAR(500) NULL,
  `transcription_extraction` TEXT NULL,
  `evidence_type` VARCHAR(500) NULL,
  `analysis` TEXT NULL,
  `supports_or_contradicts` VARCHAR(500) NULL,
  `conflicting_evidence` TEXT NULL,
  `conclusion_drawn` TEXT NULL,
  `confidence_level` VARCHAR(500) NULL,
  `name_from_sources` TEXT NULL,
  `research_question_from_research_questions` TEXT NULL,
  `full_name_from_people` TEXT NULL,
  `evidence_summary_from_conflicting_evidence` TEXT NULL,
  `from_field_conflicting_evidence` TEXT NULL,
  PRIMARY KEY (`record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DNA Testing
CREATE TABLE IF NOT EXISTS `dna_testing` (
  `record_id` VARCHAR(20) NOT NULL,
  `test_label` VARCHAR(500) NULL,
  `test_id` INT NULL,
  `kit` DOUBLE NULL,
  `test_subject` TEXT NULL,
  `company` VARCHAR(500) NULL,
  `test_type` VARCHAR(500) NULL,
  `date_tested` DATE NULL,
  `number_of_regions` DOUBLE NULL,
  `ethnicity_estimates` TEXT NULL,
  `haplogroup` VARCHAR(500) NULL,
  `hvr1_markers` TEXT NULL,
  `hvr2_markers` TEXT NULL,
  `total_cm_shared_largest_match` DOUBLE NULL,
  `raw_data_uploaded` TINYINT(1) NULL,
  `research_questions` TEXT NULL,
  `documentary_corroboration` TEXT NULL,
  `analysis_notes` TEXT NULL,
  `raw_data_file` TEXT NULL,
  `dna_matches` TEXT NULL,
  `is_linked` TEXT NULL,
  `research_question_from_research_questions` TEXT NULL,
  PRIMARY KEY (`record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DNA Matches
CREATE TABLE IF NOT EXISTS `dna_matches` (
  `record_id` VARCHAR(20) NOT NULL,
  `match_name` VARCHAR(500) NULL,
  `match_id` INT NULL,
  `test` TEXT NULL,
  `shared_cm` DOUBLE NULL,
  `shared_segments` DOUBLE NULL,
  `longest_segment` DOUBLE NULL,
  `predicted_relationship` VARCHAR(500) NULL,
  `likely_actual_relationship` VARCHAR(500) NULL,
  `possible_relationships` TEXT NULL,
  `linked_person_in_tree` TEXT NULL,
  `clustering_group` VARCHAR(500) NULL,
  `correspondence_status` VARCHAR(500) NULL,
  `correspondence_log` TEXT NULL,
  `last_contact` DATE NULL,
  `research_question` TEXT NULL,
  `notes` TEXT NULL,
  `company_from_test` TEXT NULL,
  `full_name_from_linked_person_in_tree` TEXT NULL,
  `research_question_from_research_question` TEXT NULL,
  `research_log` TEXT NULL,
  PRIMARY KEY (`record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Collections
CREATE TABLE IF NOT EXISTS `collections` (
  `record_id` VARCHAR(20) NOT NULL,
  `collection_name` VARCHAR(500) NULL,
  `description` TEXT NULL,
  `date_established` DATE NULL,
  `status` VARCHAR(500) NULL,
  `family_names` TEXT NULL,
  `archive_record` TEXT NULL,
  `sources` TEXT NULL,
  `research_questions_text` VARCHAR(500) NULL,
  `digitized_files` VARCHAR(500) NULL,
  `access_restrictions` TEXT NULL,
  `allowed_to_share_online` TINYINT(1) NULL,
  `donors` TEXT NULL,
  `name_from_archive_record` TEXT NULL,
  `research_question_from_research_questions` TEXT NULL,
  PRIMARY KEY (`record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Archives
CREATE TABLE IF NOT EXISTS `archives` (
  `record_id` VARCHAR(20) NOT NULL,
  `accession_number` VARCHAR(500) NULL,
  `description` TEXT NULL,
  `date_received` DATE NULL,
  `accession_date` DATE NULL,
  `inclusive_dates` VARCHAR(500) NULL,
  `formats_included` TEXT NULL,
  `condition` VARCHAR(500) NULL,
  `recommended_treatments` TEXT NULL,
  `restrictions_access` TEXT NULL,
  `storage_location` TEXT NULL,
  `storage_type` VARCHAR(500) NULL,
  `box_folder_reference` VARCHAR(500) NULL,
  `archival_docs_attachment` TEXT NULL,
  `collection` TEXT NULL,
  `donor` TEXT NULL,
  `creator` TEXT NULL,
  `bulk_dates` VARCHAR(500) NULL,
  `extent` VARCHAR(500) NULL,
  `full_name_from_creator` TEXT NULL,
  `name_from_donor` TEXT NULL,
  `name_from_storage_location` TEXT NULL,
  `metadata_complete` TEXT NULL,
  `image_url` VARCHAR(500) NULL,
  `ai_metadata` TEXT NULL,
  PRIMARY KEY (`record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Donors
CREATE TABLE IF NOT EXISTS `donors` (
  `record_id` VARCHAR(20) NOT NULL,
  `contact_name` VARCHAR(500) NULL,
  `title_role` VARCHAR(500) NULL,
  `idinternal_reference` VARCHAR(500) NULL,
  `address` VARCHAR(500) NULL,
  `phone` VARCHAR(500) NULL,
  `email` VARCHAR(500) NULL,
  `collections` TEXT NULL,
  `archives` TEXT NULL,
  `person_record` TEXT NULL,
  `usage_agreement_signed` TINYINT(1) NULL,
  `agreement_date` DATE NULL,
  `agreement_notes` TEXT NULL,
  `status` VARCHAR(500) NULL,
  `notes` TEXT NULL,
  `collection_name_from_collections` TEXT NULL,
  `full_name_from_person_record` TEXT NULL,
  PRIMARY KEY (`record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Storage
CREATE TABLE IF NOT EXISTS `storage` (
  `record_id` VARCHAR(20) NOT NULL,
  `location_name` VARCHAR(500) NULL,
  `location_address` VARCHAR(500) NULL,
  `location_contact` VARCHAR(500) NULL,
  `phone` VARCHAR(500) NULL,
  `email` VARCHAR(500) NULL,
  `type_of_light` TEXT NULL,
  `temperature` VARCHAR(500) NULL,
  `humidity` VARCHAR(500) NULL,
  `climate_controlled` TINYINT(1) NULL,
  `archives_stored_here` TEXT NULL,
  `storage_notes` TEXT NULL,
  PRIMARY KEY (`record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Research Log
CREATE TABLE IF NOT EXISTS `research_log` (
  `record_id` VARCHAR(20) NOT NULL,
  `log_title` VARCHAR(500) NULL,
  `person` TEXT NULL,
  `research_status` VARCHAR(500) NULL,
  `genealogical_line` VARCHAR(500) NULL,
  `generational_line` VARCHAR(500) NULL,
  `relationship` VARCHAR(500) NULL,
  `research_question` TEXT NULL,
  `sources` TEXT NULL,
  `records_checklist` TEXT NULL,
  `ancestry_profile_url` VARCHAR(500) NULL,
  `geni_com_profile_url` VARCHAR(500) NULL,
  `dna_matches` TEXT NULL,
  `notes` TEXT NULL,
  PRIMARY KEY (`record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Full family-tree export (all rows from the Airtable People 'Brick Walls' view)
DROP TABLE IF EXISTS `people_tree_archive`;
CREATE TABLE `people_tree_archive` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` TEXT NULL,
  `person_id` INT NULL,
  `birth_name` TEXT NULL,
  `also_known_as` TEXT NULL,
  `sex` TEXT NULL,
  `race_ethnicity_as_recorded` TEXT NULL,
  `birth_date` TEXT NULL,
  `birth_place` TEXT NULL,
  `death_date` TEXT NULL,
  `death_place` TEXT NULL,
  `burial_place` TEXT NULL,
  `generation_number` TEXT NULL,
  `relation_to_self` TEXT NULL,
  `line` TEXT NULL,
  `collections` TEXT NULL,
  `research_questions` TEXT NULL,
  `dna_tests` TEXT NULL,
  `ancestry_profile_url` TEXT NULL,
  `familysearch_id` TEXT NULL,
  `geni_profile_url` TEXT NULL,
  `photo` TEXT NULL,
  `notes` TEXT NULL,
  `sources` TEXT NULL,
  `evidence_analysis` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
