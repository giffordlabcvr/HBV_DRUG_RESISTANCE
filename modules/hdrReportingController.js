


function reportFastaWeb(base64, filePath) {
	glue.log("FINE", "hdrReportingController.reportFastaWeb invoked");
	var fastaDocument;
	glue.inMode("module/hbvFastaUtility", function() {
		fastaDocument = glue.command(["base64-to-nucleotide-fasta", base64]);
	});
	var numSequencesInFile = fastaDocument.nucleotideFasta.sequences.length;
	if(numSequencesInFile == 0) {
		throw new Error("No sequences found in FASTA file");
	}
	var maxSequencesWithoutAuth = 50;
	if(numSequencesInFile > maxSequencesWithoutAuth && !glue.hasAuthorisation("hbvFastaAnalysisLargeSubmissions")) {
		throw new Error("Not authorised to analyse FASTA files with more than "+maxSequencesWithoutAuth+" sequences");
	}
	
	var hdrResult;
	glue.inMode("module/hbvReportingController", function() {
		hdrResult = glue.command({
			"invoke-function": {
				"functionName": "reportDocument",
				"document": {
					"reportFastaDocument": {
						"fastaDocument": fastaDocument, 
						"filePath": filePath
					}
				}

			}
		});
	});
	var extensionVersion = 
		glue.command(["show","extension-setting","hdr","extension-version"]).projectShowExtensionSettingResult.extSettingValue;

	var fastaMap = {};
	_.each(fastaDocument.nucleotideFasta.sequences, function(seqObj) {fastaMap[seqObj.id] = seqObj;});
	var resultMap = {};
	var i = 0;
	_.each(hdrResult.hbvWebReport.results, 
			function(hbvResultObj) {
				resultMap[hbvResultObj.hbvReport.sequenceResult.id] = hbvResultObj.hbvReport.sequenceResult;
				hbvResultObj.hbvReport.extensionVersion = extensionVersion;
			});
	_.each(_.values(fastaMap), function(seqObj) {
		var resultObj = resultMap[seqObj.id];
		
		if(resultObj.isForwardHbv && resultObj.rotationSuccess && resultObj.genotypingResult != null && resultObj.genotypingResult.genotypeCategoryResult != null ) {
			var sequenceNts = seqObj.sequence;
			if(resultObj.rotationStatus == "ROTATION_NECESSARY") {
				sequenceNts = rightRotate(sequenceNts, resultObj.rotationNts);
			}
			drugResistanceScan(sequenceNts, resultObj, resultObj.genotypingResult.genotypeCategoryResult.finalClade);
		}
		i++;
		glue.setRunningDescription("Scanned for drug resistance "+i+"/"+numSequencesInFile+" sequence"+((numSequencesInFile > 1) ? "s" : ""));
	});
	i = 0;
	_.each(_.values(fastaMap), function(seqObj) {
		var resultObj = resultMap[seqObj.id];
		if(resultObj.isForwardHbv && resultObj.rotationSuccess && resultObj.genotypingResult != null && resultObj.genotypingResult.genotypeCategoryResult != null) {
			var sequenceNts = seqObj.sequence;
			if(resultObj.rotationStatus == "ROTATION_NECESSARY") {
				sequenceNts = rightRotate(sequenceNts, resultObj.rotationNts);
			}
			vaccineEscapeScan(sequenceNts, resultObj, resultObj.genotypingResult.genotypeCategoryResult.finalClade);
		}
		i++;
		glue.setRunningDescription("Scanned for vaccine escape "+i+"/"+numSequencesInFile+" sequence"+((numSequencesInFile > 1) ? "s" : ""));
	});
	

	glue.log("FINE", "hdrReportingController.reportFastaWeb result", hdrResult);
	glue.setRunningDescription("Collating report");
	return hdrResult;
}

function drugResistanceScan(sequenceNts, sequenceResult, genotypeAlmtName) {
	var sequenceID = sequenceResult.id;
	var rasVariationMatchDocument;
	glue.inMode("module/hbvFastaSequenceReporter", function() {

		rasVariationMatchDocument = glue.command(["string", "variation", "scan", 
			"--fastaString", sequenceNts,
			"--relRefName", "REF_NUMBERING_X02763", 
			"--featureName", "RT",
			"--targetRefName", sequenceResult.targetRefName, 
			"--linkingAlmtName", "AL_UNCONSTRAINED", 
			"--whereClause", "hdr_ras.hdr_ras_alignment.alignment.name in ('AL_MASTER', '"+genotypeAlmtName+"')", 
			"--excludeAbsent",
			"--showMatchesAsDocument"]);
		//glue.logInfo("rasVariationMatchDocument", rasVariationMatchDocument);

	});
	sequenceResult.antiviralResistance = _.map(rasVariationMatchDocument.variationScanMatchCommandResult.variations, function(matchObj) {
		var renderedRasDoc;
		glue.inMode("reference/REF_NUMBERING_X02763/feature-location/RT/variation/"+matchObj.variationName, function() {
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

//rotates s towards left by d  
function leftRotate(str, d) { 
	return str.slice(d) + str.slice(0, d); 
} 

// rotates s towards right by d  
function rightRotate(str, d) { 
	return leftRotate(str, str.length() - d); 
}

function vaccineEscapeScan(sequenceNts, sequenceResult, genotypeAlmtName) {
	var sequenceID = sequenceResult.id;
	_.each(["S", "PRE_S1"], function(featureName) {

		var vemVariationMatchDocument;
		glue.inMode("module/hbvFastaSequenceReporter", function() {

			vemVariationMatchDocument = glue.command(["string", "variation", "scan", 
				"--fastaString", sequenceNts,
				"--relRefName", "REF_NUMBERING_X02763", 
				"--featureName", featureName,
				"--targetRefName", sequenceResult.targetRefName, 
				"--linkingAlmtName", "AL_UNCONSTRAINED", 
				"--whereClause", "hdr_vem.hdr_vem_alignment.alignment.name in ('AL_MASTER', '"+genotypeAlmtName+"')", 
				"--excludeAbsent",
				"--showMatchesAsDocument"]);
			// glue.logInfo("vemVariationMatchDocument", vemVariationMatchDocument);

		});
		if(sequenceResult.vaccineEscape == null) {
			sequenceResult.vaccineEscape = [];
		}
		_.each(vemVariationMatchDocument.variationScanMatchCommandResult.variations, function(matchObj) {
			var renderedVemDoc;
			glue.inMode("reference/REF_NUMBERING_X02763/feature-location/"+featureName+"/variation/"+matchObj.variationName, function() {
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

	});
	
}

//### CLI Usage

function reportFastaCli(filePath) {
  glue.log("FINE", "hdrReportingController.reportFastaCli invoked, filePath="+filePath);

  // 1) read nucleotide FASTA from a file path
  var fastaDocument;
  glue.inMode("module/hbvFastaUtility", function() {
    // If hbvFastaUtility already has something like this, use it.
    // Common names in GLUE utilities are "load-nucleotide-fasta" / "import-nucleotide-fasta" style.
    fastaDocument = glue.command(["load-nucleotide-fasta", filePath]);
  });

  // 2) reuse the same machinery as reportFastaWeb
  return reportFastaDocumentCommon(fastaDocument, filePath);
}

function reportFastaDocumentCommon(fastaDocument, filePath) {
  var numSequencesInFile = fastaDocument.nucleotideFasta.sequences.length;
  if(numSequencesInFile == 0) throw new Error("No sequences found in FASTA file");

  var hdrResult;
  glue.inMode("module/hbvReportingController", function() {
    hdrResult = glue.command({
      "invoke-function": {
        "functionName": "reportDocument",
        "document": {
          "reportFastaDocument": { "fastaDocument": fastaDocument, "filePath": filePath }
        }
      }
    });
  });

  var extensionVersion =
    glue.command(["show","extension-setting","hdr","extension-version"])
      .projectShowExtensionSettingResult.extSettingValue;

  var fastaMap = {};
  _.each(fastaDocument.nucleotideFasta.sequences, function(seqObj) { fastaMap[seqObj.id] = seqObj; });

  var resultMap = {};
  _.each(hdrResult.hbvWebReport.results, function(hbvResultObj) {
    resultMap[hbvResultObj.hbvReport.sequenceResult.id] = hbvResultObj.hbvReport.sequenceResult;
    hbvResultObj.hbvReport.extensionVersion = extensionVersion;
  });

  var i = 0;
  _.each(_.values(fastaMap), function(seqObj) {
    var resultObj = resultMap[seqObj.id];
    if(resultObj && resultObj.isForwardHbv && resultObj.rotationSuccess &&
       resultObj.genotypingResult && resultObj.genotypingResult.genotypeCategoryResult) {

      var sequenceNts = seqObj.sequence;
      if(resultObj.rotationStatus == "ROTATION_NECESSARY") {
        sequenceNts = rightRotate(sequenceNts, resultObj.rotationNts);
      }
      drugResistanceScan(sequenceNts, resultObj, resultObj.genotypingResult.genotypeCategoryResult.finalClade);
    }
    i++;
    glue.setRunningDescription("Scanned for drug resistance "+i+"/"+numSequencesInFile);
  });

  i = 0;
  _.each(_.values(fastaMap), function(seqObj) {
    var resultObj = resultMap[seqObj.id];
    if(resultObj && resultObj.isForwardHbv && resultObj.rotationSuccess &&
       resultObj.genotypingResult && resultObj.genotypingResult.genotypeCategoryResult) {

      var sequenceNts = seqObj.sequence;
      if(resultObj.rotationStatus == "ROTATION_NECESSARY") {
        sequenceNts = rightRotate(sequenceNts, resultObj.rotationNts);
      }
      vaccineEscapeScan(sequenceNts, resultObj, resultObj.genotypingResult.genotypeCategoryResult.finalClade);
    }
    i++;
    glue.setRunningDescription("Scanned for vaccine escape "+i+"/"+numSequencesInFile);
  });

  return hdrResult;
}
