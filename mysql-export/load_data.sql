-- Load CSVs into MySQL. Run from the mysql-export/ folder.
-- Requires: mysql --local-infile=1  (and local_infile=1 on the server)

USE `kriogriot`;
SET FOREIGN_KEY_CHECKS=0;

-- People  (7 rows)
LOAD DATA LOCAL INFILE 'csv/people.csv'
  INTO TABLE `people`
  CHARACTER SET utf8mb4
  FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY ''
  LINES TERMINATED BY '\n'
  IGNORE 1 LINES
  (`record_id`, `full_name`, @person_id, `birth_name`, `also_known_as`, `sex`, `race_ethnicity_as_recorded`, `birth_date`, `birth_place`, `death_date`, `death_place`, `burial_place`, `generation_number`, `relation_to_self`, `line`, `collections`, `research_questions`, `dna_tests`, `ancestry_profile_url`, `familysearch_id`, `geni_profile_url`, `photo`, `notes`, `sources`, `evidence_analysis`, `name_from_collections`, `research_question_from_research_questions`, `name_from_dna_tests`, `dna_matches`, `archives`, `donors`, `research_log`, `photo_url`)
  SET
  `person_id` = NULLIF(@person_id, '');

-- Research Questions  (2 rows)
LOAD DATA LOCAL INFILE 'csv/research_questions.csv'
  INTO TABLE `research_questions`
  CHARACTER SET utf8mb4
  FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY ''
  LINES TERMINATED BY '\n'
  IGNORE 1 LINES
  (`record_id`, `research_question`, @question_id, `research_type`, `status`, `priority`, @date_opened, @date_resolved, `current_conclusion`, `gaps_identified`, `conflicting_evidence`, `next_action`, @reasonably_exhaustive_search_done, @all_evidence_cited, @conflicts_resolved, @written_conclusion_exists, `collections_text`, `sources_consulted`, `evidence_items`, `dna_tests_text`, `people`, `sources`, `evidence_analysis`, `dna_testing`, `dna_matches`, `has_evidence`, `research_log`)
  SET
  `question_id` = NULLIF(@question_id, ''),
  `date_opened` = NULLIF(@date_opened, ''),
  `date_resolved` = NULLIF(@date_resolved, ''),
  `reasonably_exhaustive_search_done` = NULLIF(@reasonably_exhaustive_search_done, ''),
  `all_evidence_cited` = NULLIF(@all_evidence_cited, ''),
  `conflicts_resolved` = NULLIF(@conflicts_resolved, ''),
  `written_conclusion_exists` = NULLIF(@written_conclusion_exists, '');

-- Sources  (90 rows)
LOAD DATA LOCAL INFILE 'csv/sources.csv'
  INTO TABLE `sources`
  CHARACTER SET utf8mb4
  FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY ''
  LINES TERMINATED BY '\n'
  IGNORE 1 LINES
  (`record_id`, `name`, @source_id, `source_type`, `record_type`, `repository`, `url`, `physical_location`, `date_of_source`, @date_accessed, `full_citation`, `short_citation`, `search_status`, `search_notes`, `collections`, `research_questions`, `people_mentioned`, `attachments`, `name_from_collections`, `research_question_from_research_questions`, `full_name_from_people_mentioned`, `evidence_analysis`, `has_citation`, `research_log`, `source_file_url`)
  SET
  `source_id` = NULLIF(@source_id, ''),
  `date_accessed` = NULLIF(@date_accessed, '');

-- Evidence Analysis  (3 rows)
LOAD DATA LOCAL INFILE 'csv/evidence_analysis.csv'
  INTO TABLE `evidence_analysis`
  CHARACTER SET utf8mb4
  FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY ''
  LINES TERMINATED BY '\n'
  IGNORE 1 LINES
  (`record_id`, `evidence_summary`, @evidence_id, `sources`, `research_questions`, `people`, `information_type`, `transcription_extraction`, `evidence_type`, `analysis`, `supports_or_contradicts`, `conflicting_evidence`, `conclusion_drawn`, `confidence_level`, `name_from_sources`, `research_question_from_research_questions`, `full_name_from_people`, `evidence_summary_from_conflicting_evidence`, `from_field_conflicting_evidence`)
  SET
  `evidence_id` = NULLIF(@evidence_id, '');

-- DNA Testing  (2 rows)
LOAD DATA LOCAL INFILE 'csv/dna_testing.csv'
  INTO TABLE `dna_testing`
  CHARACTER SET utf8mb4
  FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY ''
  LINES TERMINATED BY '\n'
  IGNORE 1 LINES
  (`record_id`, `test_label`, @test_id, @kit, `test_subject`, `company`, `test_type`, @date_tested, @number_of_regions, `ethnicity_estimates`, `haplogroup`, `hvr1_markers`, `hvr2_markers`, @total_cm_shared_largest_match, @raw_data_uploaded, `research_questions`, `documentary_corroboration`, `analysis_notes`, `raw_data_file`, `dna_matches`, `is_linked`, `research_question_from_research_questions`)
  SET
  `test_id` = NULLIF(@test_id, ''),
  `kit` = NULLIF(@kit, ''),
  `date_tested` = NULLIF(@date_tested, ''),
  `number_of_regions` = NULLIF(@number_of_regions, ''),
  `total_cm_shared_largest_match` = NULLIF(@total_cm_shared_largest_match, ''),
  `raw_data_uploaded` = NULLIF(@raw_data_uploaded, '');

-- DNA Matches  (1 rows)
LOAD DATA LOCAL INFILE 'csv/dna_matches.csv'
  INTO TABLE `dna_matches`
  CHARACTER SET utf8mb4
  FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY ''
  LINES TERMINATED BY '\n'
  IGNORE 1 LINES
  (`record_id`, `match_name`, @match_id, `test`, @shared_cm, @shared_segments, @longest_segment, `predicted_relationship`, `likely_actual_relationship`, `possible_relationships`, `linked_person_in_tree`, `clustering_group`, `correspondence_status`, `correspondence_log`, @last_contact, `research_question`, `notes`, `company_from_test`, `full_name_from_linked_person_in_tree`, `research_question_from_research_question`, `research_log`)
  SET
  `match_id` = NULLIF(@match_id, ''),
  `shared_cm` = NULLIF(@shared_cm, ''),
  `shared_segments` = NULLIF(@shared_segments, ''),
  `longest_segment` = NULLIF(@longest_segment, ''),
  `last_contact` = NULLIF(@last_contact, '');

-- Collections  (14 rows)
LOAD DATA LOCAL INFILE 'csv/collections.csv'
  INTO TABLE `collections`
  CHARACTER SET utf8mb4
  FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY ''
  LINES TERMINATED BY '\n'
  IGNORE 1 LINES
  (`record_id`, `collection_name`, `description`, @date_established, `status`, `family_names`, `archive_record`, `sources`, `research_questions_text`, `digitized_files`, `access_restrictions`, @allowed_to_share_online, `donors`, `name_from_archive_record`, `research_question_from_research_questions`)
  SET
  `date_established` = NULLIF(@date_established, ''),
  `allowed_to_share_online` = NULLIF(@allowed_to_share_online, '');

-- Archives  (2 rows)
LOAD DATA LOCAL INFILE 'csv/archives.csv'
  INTO TABLE `archives`
  CHARACTER SET utf8mb4
  FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY ''
  LINES TERMINATED BY '\n'
  IGNORE 1 LINES
  (`record_id`, `accession_number`, `description`, @date_received, @accession_date, `inclusive_dates`, `formats_included`, `condition`, `recommended_treatments`, `restrictions_access`, `storage_location`, `storage_type`, `box_folder_reference`, `archival_docs_attachment`, `collection`, `donor`, `creator`, `bulk_dates`, `extent`, `full_name_from_creator`, `name_from_donor`, `name_from_storage_location`, `metadata_complete`, `image_url`, `ai_metadata`)
  SET
  `date_received` = NULLIF(@date_received, ''),
  `accession_date` = NULLIF(@accession_date, '');

-- Donors  (2 rows)
LOAD DATA LOCAL INFILE 'csv/donors.csv'
  INTO TABLE `donors`
  CHARACTER SET utf8mb4
  FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY ''
  LINES TERMINATED BY '\n'
  IGNORE 1 LINES
  (`record_id`, `contact_name`, `title_role`, `idinternal_reference`, `address`, `phone`, `email`, `collections`, `archives`, `person_record`, @usage_agreement_signed, @agreement_date, `agreement_notes`, `status`, `notes`, `collection_name_from_collections`, `full_name_from_person_record`)
  SET
  `usage_agreement_signed` = NULLIF(@usage_agreement_signed, ''),
  `agreement_date` = NULLIF(@agreement_date, '');

-- Storage  (1 rows)
LOAD DATA LOCAL INFILE 'csv/storage.csv'
  INTO TABLE `storage`
  CHARACTER SET utf8mb4
  FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY ''
  LINES TERMINATED BY '\n'
  IGNORE 1 LINES
  (`record_id`, `location_name`, `location_address`, `location_contact`, `phone`, `email`, `type_of_light`, `temperature`, `humidity`, @climate_controlled, `archives_stored_here`, `storage_notes`)
  SET
  `climate_controlled` = NULLIF(@climate_controlled, '');

-- Research Log  (1 rows)
LOAD DATA LOCAL INFILE 'csv/research_log.csv'
  INTO TABLE `research_log`
  CHARACTER SET utf8mb4
  FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY ''
  LINES TERMINATED BY '\n'
  IGNORE 1 LINES
  (`record_id`, `log_title`, `person`, `research_status`, `genealogical_line`, `generational_line`, `relationship`, `research_question`, `sources`, `records_checklist`, `ancestry_profile_url`, `geni_com_profile_url`, `dna_matches`, `notes`);

-- Full family-tree archive: all 2,770 GEDCOM rows (reference only)
LOAD DATA LOCAL INFILE 'csv/people_full_export.csv'
  INTO TABLE `people_tree_archive`
  CHARACTER SET utf8mb4
  FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"' ESCAPED BY ''
  LINES TERMINATED BY '\n'
  IGNORE 1 LINES
  (`full_name`, @person_id, `birth_name`, `also_known_as`, `sex`, `race_ethnicity_as_recorded`, `birth_date`, `birth_place`, `death_date`, `death_place`, `burial_place`, `generation_number`, `relation_to_self`, `line`, `collections`, `research_questions`, `dna_tests`, `ancestry_profile_url`, `familysearch_id`, `geni_profile_url`, `photo`, `notes`, `sources`, `evidence_analysis`)
  SET
  `person_id` = NULLIF(@person_id, '');

SET FOREIGN_KEY_CHECKS=1;
