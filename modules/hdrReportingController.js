


function reportFasta(fastaFilePath) {
	var fastaDocument = loadFasta(fastaFilePath);
	var resultMap = initResultMap(fastaDocument);
	resolveGenotypeAndDirection(fastaDocument, resultMap);
	resolveRotation(fastaDocument, resultMap);
	selectTargetReference(fastaDocument, resultMap);
	drugResistanceScan(fastaDocument, resultMap);
	vaccineEscapeScan(fastaDocument, resultMap);
	return { hdrReportingResult : {
		"sequenceResults": _.values(resultMap)
	} };
}

function reportFastaAsHtml(fastaFilePath, htmlFilePath) {
	var reportDoc = reportFasta(fastaFilePath);
	glue.inMode("module/hdrRasReportTransformer", function() {
		glue.command({"transform-to-file" : {
			commandDocument: reportDoc,
			outputFile: htmlFilePath
		}});
	});
	
}

function drugResistanceScan(fastaDocument, resultMap) {
	_.each(fastaDocument.nucleotideFasta.sequences, function(seqObj) {
		var seqNts = seqObj.sequence;
		var sequenceID = seqObj.id;
		var resultObj = resultMap[sequenceID];
		if(resultObj.targetReference != null) {
			var rasVariationMatchDocument;
			glue.inMode("module/hbvFastaSequenceReporter", function() {

				rasVariationMatchDocument = glue.command(["string", "variation", "scan", 
					"--fastaString", seqNts,
					"--relRefName", "REF_MASTER_NC_003977", 
					"--featureName", "RT",
					"--targetRefName", resultObj.targetReference, 
					"--linkingAlmtName", "AL_UNCONSTRAINED", 
					"--whereClause", "hdr_ras.hdr_ras_alignment.alignment.name in ('AL_MASTER', 'AL_"+resultObj.genotype+"')", 
					"--excludeAbsent",
					"--showMatchesAsDocument"]);
				//glue.logInfo("rasVariationMatchDocument", rasVariationMatchDocument);

			});
			resultObj.antiviralResistance = _.map(rasVariationMatchDocument.variationScanMatchCommandResult.variations, function(matchObj) {
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
		
	});
	
}

function vaccineEscapeScan(fastaDocument, resultMap) {
	_.each(fastaDocument.nucleotideFasta.sequences, function(seqObj) {
		var seqNts = seqObj.sequence;
		var sequenceID = seqObj.id;
		var resultObj = resultMap[sequenceID];
		_.each(["S", "PRE_S1"], function(featureName) {

			if(resultObj.targetReference != null) {
				var vemVariationMatchDocument;
				glue.inMode("module/hbvFastaSequenceReporter", function() {

					vemVariationMatchDocument = glue.command(["string", "variation", "scan", 
						"--fastaString", seqNts,
						"--relRefName", "REF_MASTER_NC_003977", 
						"--featureName", featureName,
						"--targetRefName", resultObj.targetReference, 
						"--linkingAlmtName", "AL_UNCONSTRAINED", 
						"--whereClause", "hdr_vem.hdr_vem_alignment.alignment.name in ('AL_MASTER', 'AL_"+resultObj.genotype+"')", 
						"--excludeAbsent",
						"--showMatchesAsDocument"]);
					glue.logInfo("vemVariationMatchDocument", vemVariationMatchDocument);

				});
				if(resultObj.vaccineEscape == null) {
					resultObj.vaccineEscape = [];
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
					resultObj.vaccineEscape.push(renderedVemDoc);
				});
			}
			
		});
	
	});
	
}



function selectTargetReference(fastaDocument, resultMap) {
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

function resolveRotation(fastaDocument, resultMap) {
	var rotatorResultObjs;
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
	_.each(fastaDocument.nucleotideFasta.sequences, function(sequenceObj) {
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

function resolveGenotypeAndDirection(fastaDocument, resultMap) {
	var recogniserResultObjs;
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
	_.each(fastaDocument.nucleotideFasta.sequences, function(sequenceObj) {
		var resultObj = resultMap[sequenceObj.id];
		if(resultObj.directionStatus == "RESOLVED" && resultObj.direction == "REVERSE") {
			glue.inMode("module/hbvFastaUtility", function() {
				sequenceObj.sequence = glue.command(["reverse-complement", "string", "-s", sequenceObj.sequence]).reverseComplementFastaResult.reverseComplement;
			});
		}
	});

}

function initResultMap(fastaDocument) {
	var resultMap = {};
	_.each(fastaDocument.nucleotideFasta.sequences, function(sequenceObj) {
		resultMap[sequenceObj.id] = { "sequenceID": sequenceObj.id };
	});
	return resultMap;
}

function loadFasta(fastaFilePath) {
	var fastaDocument;
	glue.inMode("module/hbvFastaUtility", function() {
		fastaDocument = glue.command(["load-nucleotide-fasta", fastaFilePath]);
	});
	return fastaDocument;
}
