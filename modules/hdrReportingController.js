



function reportFastaWeb(base64, filePath) {
	var fastaDocument;
	glue.inMode("module/hdrFastaUtility", function() {
		fastaDocument = glue.command(["base64-to-nucleotide-fasta", base64]);
	});
	var numSequencesInFile = fastaDocument.nucleotideFasta.sequences.length;
	if(numSequencesInFile == 0) {
		throw new Error("No sequences found in FASTA file");
	}
	var maxSequencesWithoutAuth = 20;
	if(numSequencesInFile > maxSequencesWithoutAuth && !glue.hasAuthorisation("hbvFastaAnalysisLargeSubmissions")) {
		throw new Error("Not authorised to analyse FASTA files with more than "+maxSequencesWithoutAuth+" sequences");
	}
	var fastaMap = {};
	var resultMap = {};

	initResultMap(fastaDocument, fastaMap, resultMap);

	var cmdDocs = _.map(fastaDocument.nucleotideFasta.sequences, function(sequence) {
		return { 
			"modePath": "module/hdrReportingController",
			"command": {
				"invoke-function" : {
					"functionName" : "generateSingleFastaReport",
					"document" : 
					{ 
						singleFastaInputDoc: {
							sequenceNts: sequence.sequence,
							sequenceResult: resultMap[sequence.id],
							fastaFilePath: filePath
						}
					} 
				}
			}
		};
	});
	var hdrReports;
	var i = 0;
	var numSeqs = fastaDocument.nucleotideFasta.sequences.length;
	glue.setRunningDescription("Scanned "+i+"/"+numSeqs+" sequences for drug resistance / vaccine escape");
	hdrReports = glue.parallelCommands(cmdDocs, {
		"completedCmdCallback": function() {
			i++;
			glue.setRunningDescription("Scanned "+i+"/"+numSeqs+" sequences for drug resistance / vaccine escape");
		}
	});

	var result = {
			hdrWebReport:  { 
				results: hdrReports
			}
	};
	return result;
}


function reportFasta(fastaFilePath) {
	
	var fastaDocument;
	glue.inMode("module/hdrFastaUtility", function() {
		fastaDocument = glue.command(["load-nucleotide-fasta", fastaFilePath]);
	});
	var numSequencesInFile = fastaDocument.nucleotideFasta.sequences.length;
	if(numSequencesInFile == 0) {
		throw new Error("No sequences found in FASTA file");
	}
	if(numSequencesInFile > 1) {
		throw new Error("Please use only one sequence per FASTA file");
	}
	var fastaMap = {};
	var resultMap = {};
	initResultMap(fastaDocument, fastaMap, resultMap);
	var inputDoc = {
			singleFastaInputDoc : {
				sequenceNts: _.values(fastaMap)[0].sequence,
				sequenceResult: _.values(resultMap)[0],
				fastaFilePath: fastaFilePath
			}
	};
	return generateSingleFastaReport(inputDoc);
}


function generateSingleFastaReport(inputDocument) {
	var sequenceNts = inputDocument.singleFastaInputDoc.sequenceNts;
	var sequenceResult = inputDocument.singleFastaInputDoc.sequenceResult;
	var fastaFilePath = inputDocument.singleFastaInputDoc.fastaFilePath;
	
	drugResistanceScan(sequenceNts, sequenceResult);
	vaccineEscapeScan(sequenceNts, sequenceResult);
	
	var hdrReport = { 
			hdrReport: {
				sequenceDataFormat: "FASTA",
				filePath: fastaFilePath,
				sequenceResult: sequenceResult
			}
		};
	addOverview(hdrReport);
	return hdrReport;
}

function addOverview(hdrReport) {
	var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth()+1; // January is 0!
	var yyyy = today.getFullYear();
	if(dd < 10) {
	    dd = '0'+dd
	} 
	if(mm < 10) {
	    mm = '0'+mm
	} 
	hdrReport.hdrReport.reportGenerationDate = dd + '/' + mm + '/' + yyyy;
	hdrReport.hdrReport.engineVersion = 
		glue.command(["glue-engine","show-version"]).glueEngineShowVersionResult.glueEngineVersion;
	hdrReport.hdrReport.projectVersion = 
		glue.command(["show","setting","project-version"]).projectShowSettingResult.settingValue;
	hdrReport.hdrReport.extensionVersion = 
		glue.command(["show","extension-setting","hdr","extension-version"]).projectShowExtensionSettingResult.extSettingValue;
	
}


function reportFastaAsHtml(fastaFilePath, htmlFilePath) {
	var reportDoc = reportFasta(fastaFilePath);
	glue.logInfo("reportDoc", reportDoc);
	glue.inMode("module/hdrRasReportTransformer", function() {
		glue.command({"transform-to-file" : {
			commandDocument: reportDoc,
			outputFile: htmlFilePath
		}});
	});
	
}

function drugResistanceScan(sequenceNts, sequenceResult) {
	var sequenceID = sequenceResult.id;
	if(sequenceResult.targetReference != null) {
		var rasVariationMatchDocument;
		glue.inMode("module/hbvFastaSequenceReporter", function() {

			rasVariationMatchDocument = glue.command(["string", "variation", "scan", 
				"--fastaString", sequenceNts,
				"--relRefName", "REF_MASTER_NC_003977", 
				"--featureName", "RT",
				"--targetRefName", sequenceResult.targetReference, 
				"--linkingAlmtName", "AL_UNCONSTRAINED", 
				"--whereClause", "hdr_ras.hdr_ras_alignment.alignment.name in ('AL_MASTER', 'AL_"+sequenceResult.genotype+"')", 
				"--excludeAbsent",
				"--showMatchesAsDocument"]);
			//glue.logInfo("rasVariationMatchDocument", rasVariationMatchDocument);

		});
		sequenceResult.antiviralResistance = _.map(rasVariationMatchDocument.variationScanMatchCommandResult.variations, function(matchObj) {
			var renderedRasDoc;
			glue.inMode("reference/REF_MASTER_NC_003977/feature-location/RT/variation/"+matchObj.variationName, function() {
				renderedRasDoc = glue.command(["render-object", "hdrRasVariationRenderer"]).hdrRasVariation;
				if(matchObj.variationType == 'aminoAcidRegexPolymorphism') {
					renderedRasDoc.detectedPattern = matchObj.matches[0].firstRefCodon + matchObj.matches[0].queryAAs;
				} else if(matchObj.variationType == 'conjunction') {
					var conjunctMatches = matchObj.matches[0].conjuncts;
					renderedRasDoc.detectedPattern = "";
					for(var i = 0; i < conjunctMatches.length; i++) {
						if(i > 0) {
							renderedRasDoc.detectedPattern +="+";
						}
						renderedRasDoc.detectedPattern += conjunctMatches[i].matches[0].firstRefCodon + conjunctMatches[i].matches[0].queryAAs;
					}
				} else {
					throw new Error("Unable to handle variationType "+matchObj.variationType);
				}
			});	
			return renderedRasDoc;
		});
	}
}

function vaccineEscapeScan(sequenceNts, sequenceResult) {
	var sequenceID = sequenceResult.id;
	_.each(["S", "PRE_S1"], function(featureName) {

		if(sequenceResult.targetReference != null) {
			var vemVariationMatchDocument;
			glue.inMode("module/hbvFastaSequenceReporter", function() {

				vemVariationMatchDocument = glue.command(["string", "variation", "scan", 
					"--fastaString", sequenceNts,
					"--relRefName", "REF_MASTER_NC_003977", 
					"--featureName", featureName,
					"--targetRefName", sequenceResult.targetReference, 
					"--linkingAlmtName", "AL_UNCONSTRAINED", 
					"--whereClause", "hdr_vem.hdr_vem_alignment.alignment.name in ('AL_MASTER', 'AL_"+sequenceResult.genotype+"')", 
					"--excludeAbsent",
					"--showMatchesAsDocument"]);
				// glue.logInfo("vemVariationMatchDocument", vemVariationMatchDocument);

			});
			if(sequenceResult.vaccineEscape == null) {
				sequenceResult.vaccineEscape = [];
			}
			_.each(vemVariationMatchDocument.variationScanMatchCommandResult.variations, function(matchObj) {
				var renderedVemDoc;
				glue.inMode("reference/REF_MASTER_NC_003977/feature-location/"+featureName+"/variation/"+matchObj.variationName, function() {
					renderedVemDoc = glue.command(["render-object", "hdrVemVariationRenderer"]).hdrVemVariation;
					if(matchObj.variationType == 'aminoAcidRegexPolymorphism') {
						renderedVemDoc.detectedPattern = matchObj.matches[0].firstRefCodon + matchObj.matches[0].queryAAs;
					} else if(matchObj.variationType == 'conjunction') {
						var conjunctMatches = matchObj.matches[0].conjuncts;
						renderedVemDoc.detectedPattern = "";
						for(var i = 0; i < conjunctMatches.length; i++) {
							if(i > 0) {
								renderedVemDoc.detectedPattern +="+";
							}
							renderedVemDoc.detectedPattern += conjunctMatches[i].matches[0].firstRefCodon + conjunctMatches[i].matches[0].queryAAs;
						}
					} else {
						throw new Error("Unable to handle variationType "+matchObj.variationType);
					}
				});	
				sequenceResult.vaccineEscape.push(renderedVemDoc);
			});
		}
		
	});
	
}



function selectTargetReference(resultMap) {
	_.each(_.pairs(resultMap), function(pair) {
		var querySequenceID = pair[0];
		var resultObj = pair[1];
		if(resultObj.rotationStatus == "RESOLVED" && 
				resultObj.directionStatus == "RESOLVED" &&
				resultObj.genotypingStatus == "RESOLVED") {
			var targetRef;
			switch(resultObj.genotype) {
			case "A":
				targetRef = "REF_A1_AB076678";
				break;
			case "B":
				targetRef = "REF_B1_AB073853";
				break;
			case "C":
				targetRef = "REF_C1_AB112063";
				break;
			case "D":
				targetRef = "REF_MASTER_NC_003977";
				break;
			case "E":
				targetRef = "REF_E_AB091255";
				break;
			case "F":
				targetRef = "REF_F1_AB116654";
				break;
			case "G":
				targetRef = "REF_G_AB056513";
				break;
			case "H":
				targetRef = "REF_H_AB818694";
				break;
			case "I":
				targetRef = "REF_I_AB231908";
				break;
			case "J":
				targetRef = "REF_J_AB486012";
				break;
			default:
				throw new Error("Unknown genotype '"+resultObj.genotype+"'");
			}
		}
		resultObj.targetReference = targetRef;
	});
}

function resolveRotation(fastaMap, resultMap) {
	var sequenceObjs = _.values(fastaMap);
	var rotatorResultObjs;
	var fastaDocument = {
			"nucleotideFasta" : {
				"sequences" : sequenceObjs
			}
		};
	glue.inMode("module/hbvBlastSequenceRotator", function() {
		rotatorResultObjs = glue.tableToObjects(glue.command({"rotate": {
			"fasta-document": {
				"fastaCommandDocument": fastaDocument
			}
		}}));
	});
	_.each(rotatorResultObjs, function(rotatorResultObj) {
		var resultObj = resultMap[rotatorResultObj.querySequenceId];
		if(rotatorResultObj.status == "ROTATION_NECESSARY") {
			resultObj.rotationStatus = "RESOLVED";
			resultObj.rotationNts = rotatorResultObj.rotationNts;
		} else if(rotatorResultObj.status == "NO_ROTATION_NECESSARY") {
			resultObj.rotationStatus = "RESOLVED";
			resultObj.rotationNts = 0;
		} else {
			resultObj.rotationStatus = "FAILED";
			resultObj.rotationNts = null;
		}
	});
	// apply rotation to fasta document as necessary
	_.each(sequenceObjs, function(sequenceObj) {
		var resultObj = resultMap[sequenceObj.id];
		// rotationNts interpreted as the number of nt positions to shift to the right
		if(resultObj.rotationStatus == "RESOLVED" && resultObj.rotationNts > 0) {
			var leftShift = sequenceObj.sequence.length - resultObj.rotationNts;
			sequenceObj.sequence = 
				sequenceObj.sequence.substring(leftShift) 
				+ sequenceObj.sequence.substring(0, leftShift);
		}
	});
}

function resolveGenotypeAndDirection(fastaMap, resultMap) {
	var sequenceObjs = _.values(fastaMap);
	var recogniserResultObjs;
	var fastaDocument = {
			"nucleotideFasta" : {
				"sequences" : sequenceObjs
			}
	};
	glue.inMode("module/hbvGenotypeRecogniser", function() {
		recogniserResultObjs = glue.tableToObjects(glue.command({"recognise": {
			"fasta-document": {
				"fastaCommandDocument": fastaDocument
			}
		}}));
	});

	var recogniserResultGroups = _.groupBy(recogniserResultObjs, "querySequenceId");
	_.each(_.pairs(recogniserResultGroups), function(pair) {
		var querySequenceId = pair[0];
		var resultObj = resultMap[querySequenceId];
		
		var genotypes = _.map(pair[1], function(row) {return row.categoryId});
		
		resultObj.genotypingStatus = "FAILED";
		resultObj.genotype = null;
		if(genotypes.length == 1) {
			if(genotypes[0] != null) {
				resultObj.genotypingStatus = "RESOLVED";
				resultObj.genotype = genotypes[0];
			}
		} else if(genotypes.length > 1) {
			resultObj.genotypingStatus = "UNCLEAR";
		}
		
		var directions = _.map(pair[1], function(row) {return row.direction});
		resultObj.directionStatus = "FAILED";
		resultObj.direction = null;
		if(directions.length == 1) {
			if(directions[0] != null) {
				resultObj.directionStatus = "RESOLVED";
				resultObj.direction = directions[0];
			}
		} else if(directions.length > 1) {
			resultObj.directionStatus = "UNCLEAR";
		}
	});
	// apply reverse complementing to fasta document as necessary
	_.each(sequenceObjs, function(sequenceObj) {
		var resultObj = resultMap[sequenceObj.id];
		if(resultObj.directionStatus == "RESOLVED" && resultObj.direction == "REVERSE") {
			glue.inMode("module/hbvFastaUtility", function() {
				sequenceObj.sequence = glue.command(["reverse-complement", "string", "-s", sequenceObj.sequence]).reverseComplementFastaResult.reverseComplement;
			});
		}
	});

}

function initResultMap(fastaDocument, fastaMap, resultMap) {
	_.each(fastaDocument.nucleotideFasta.sequences, function(sequenceObj) {
		fastaMap[sequenceObj.id] = sequenceObj;
	});
	var sequenceObjs = _.values(fastaMap);
	_.each(sequenceObjs, function(sequenceObj) {
		resultMap[sequenceObj.id] = { 
			id: sequenceObj.id
		};
	});
	resolveGenotypeAndDirection(fastaMap, resultMap);
	resolveRotation(fastaMap, resultMap);
	selectTargetReference(resultMap);
}

