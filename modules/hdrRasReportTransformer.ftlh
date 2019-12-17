<html>
<head>
<meta charset="UTF-8">
<style>
${getResourceAsString('hdrRasReportTransformer.css')?no_esc}
</style>
</head>
<body>


<div id="block1">
<div id="titleAndOverview">
<h2>Hepatitis B virus sequence report</h2>

<p>
	THIS FUNCTIONALITY IS PURELY FOR DEMONSTRATION PURPOSES AND SHOULD NOT IN ANY WAY BE USED IN A PUBLIC HEALTH, MEDICAL OR CLINICAL CONTEXT.		
</p>

<table id="overview">
<colgroup>
    <col class="tableHeader"/>
    <col/>
</colgroup>

<tr><td><b>File path</b></td><td>${hbvReport.filePath}</td></tr>
<tr><td><b>Sequance data format</b></td><td>
<#if hbvReport.sequenceDataFormat = "FASTA"> 
Consensus (FASTA)
</#if>
</td></tr>
<#if hbvReport.sequenceDataFormat = "FASTA"> 
<tr>
<td><b>Sequence ID</b></td>
<td>${hbvReport.sequenceResult.id}</td>
</tr>
</#if>
<tr><td><b>Report generation date</b></td><td>${hbvReport.reportGenerationDate}</td></tr>
</table>

</div>
<div id="logos">
<img id="cvrLogo" alt="CVR logo" src="data:image/svg+xml;base64,${getResourceAsBase64('cvrLogo.svg')}" />
</div>
</div>




<#assign pubIdToIdx = {}>
<#assign pubIdToPubHash = {}>
<#assign nextPubIdx = 1>

<#assign sequenceResult = hbvReport.sequenceResult>
<p>
<h4>Sequence classification</h4>
<table>
<colgroup>
    <col class="tableHeader"/>
    <col/>
</colgroup>

<tr>
<td><b>Sequence identified as HBV?</b></td>
<#if sequenceResult.isForwardHbv>
<td>Yes</td>
<#else>
<td>No</td>
</#if>
</tr>
<tr>
<td><b>Rightward nucleotide rotation</b></td>
<#if sequenceResult.rotationSuccess>
<#if sequenceResult.rotationStatus = 'ROTATION_NECESSARY'>
<td>${sequenceResult.rotationNts?c}</td>
<#else>
<td>No rotation necessary</td>
</#if>
<#else>
<td>Unknown</td>
</#if>
</tr>


<tr>
<td><b>Genotype</b></td>
<#if sequenceResult.genotypingResult?? && sequenceResult.genotypingResult.genotypeCategoryResult??>
<td>${sequenceResult.genotypingResult.genotypeCategoryResult.shortRenderedName?replace('Genotype ', '')}</td>
<#else>
<td>Unknown</td>
</#if>
</tr>

<tr>
<td><b>Subgenotype</b></td>
<#if sequenceResult.genotypingResult?? && sequenceResult.genotypingResult.subgenotypeCategoryResult??>
<td>${sequenceResult.genotypingResult.subgenotypeCategoryResult.shortRenderedName?replace('Subgenotype ', '')}</td>
<#else>
<td>Unknown</td>
</#if>
</tr>


</table>
</p>

<div class="pagebreak"> </div>


<p>
<h4>Antiviral drug resistance</h4>
<#if sequenceResult.antiviralResistance?? && sequenceResult.antiviralResistance?size gt 0>
<table>
<tr class="tableHeader">
  <td><b>Virus protein</b></td>
  <td><b>Resistant pattern</b></td>
  <td><b>Detected pattern</b></td>
  <td><b>Resisted drug</b></td>
  <td><b>Genotypes</b></td>
  <td><b>References</b></td>
</tr>
<#list sequenceResult.antiviralResistance as substitution>
<tr>
<td>${substitution.virusDomainDisplayName}</td>
<td>${substitution.description}</td>
<td>${substitution.detectedPattern}</td>
<td>
${substitution.drug.name} (${substitution.drug.abbreviatedName})
</td>
<td>
<#list substitution.clade as clade>
<#if clade.name = 'AL_MASTER'>All genotypes<#else>${clade.displayName?replace('Genotype ', '')}</#if><#if !clade?is_last>,</#if>
</#list>
</td>
<td>
<#list substitution.publication as publication>
<#if pubIdToIdx[publication.id]??>
<#assign pubIndex = pubIdToIdx[publication.id]>
<#else>
<#assign pubIndex = nextPubIdx>
<#assign pubIdToIdx = pubIdToIdx+{publication.id: pubIndex}>
<#assign pubIdToPubHash = pubIdToPubHash+{publication.id: publication}>
<#assign nextPubIdx = nextPubIdx+1>
</#if>
<a target="_blank" href="${publication.url}">${publication.authorsShort} ${publication.year}</a> [${pubIndex}]<#if !publication?is_last>,</#if>
</#list>
</td>
</tr>
</#list>
</table>
<#else>
<#if sequenceResult.antiviralResistance??>
No resistant substitutions found
<#else>
No resistance scan was performed
</#if>
</#if>
</p>

<div class="pagebreak"> </div>

<p>
<h4>Vaccine escape</h4>
<#if sequenceResult.vaccineEscape?? && sequenceResult.vaccineEscape?size gt 0>
<table>
<tr class="tableHeader">
  <td><b>Virus protein</b></td>
  <td><b>Escape pattern</b></td>
  <td><b>Detected pattern</b></td>
  <td><b>Genotypes</b></td>
  <td><b>References</b></td>
</tr>
<#list sequenceResult.vaccineEscape as substitution>
<tr>
<td>${substitution.virusDomainDisplayName}</td>
<td>${substitution.description}</td>
<td>${substitution.detectedPattern}</td>
<td>
<#list substitution.clade as clade>
<#if clade.name = 'AL_MASTER'>All genotypes<#else>${clade.displayName?replace('Genotype ', '')}</#if><#if !clade?is_last>,</#if>
</#list>
</td>
<td>
<#list substitution.publication as publication>
<#if pubIdToIdx[publication.id]??>
<#assign pubIndex = pubIdToIdx[publication.id]>
<#else>
<#assign pubIndex = nextPubIdx>
<#assign pubIdToIdx = pubIdToIdx+{publication.id: pubIndex}>
<#assign pubIdToPubHash = pubIdToPubHash+{publication.id: publication}>
<#assign nextPubIdx = nextPubIdx+1>
</#if>
<a target="_blank" href="${publication.url}">${publication.authorsShort} ${publication.year}</a> [${pubIndex}]<#if !publication?is_last>,</#if>
</#list>
</td>
</tr>
</#list>
</table>
<#else>
<#if sequenceResult.vaccineEscape??>
No vaccine escape mutations found
<#else>
No vaccine escape scan was performed
</#if>
</#if>
</p>

<div class="pagebreak"> </div>

<#if pubIdToIdx?size gt 0>
<h4>References</h4>
<small>
<#list pubIdToIdx as pubId, pubIdx>
<#assign publication = pubIdToPubHash[pubId]>
<p>
[${pubIdx}] 
<b>${publication.title}</b>
<br/>
${publication.authorsFull}, 
${publication.journal}
<#if publication.volume?? && publication.issue??>
	${publication.volume}(${publication.issue}),
<#elseif publication.volume??>
	${publication.volume},
</#if>
<#if publication.pages??>
	${publication.pages}
</#if>
(${publication.year})
<br/>
<a target="_blank" href="${publication.url}">${publication.url}</a> 
</p>
</#list>
</small>
</#if>

<div class="pagebreak"> </div>

<div id="configuration">
<h4>System configuration</h4>
<table id="systemConfigTable">
<colgroup style="width:50%">
    <col class="tableHeader"/>
</colgroup>
<colgroup style="width:50%">
    <col/>
</colgroup>
<tr><td><b>GLUE engine version</b></td><td>${hbvReport.engineVersion}</td></tr>
<tr><td><b>HBV project version</b></td><td>${hbvReport.projectVersion}</td></tr>
<tr><td><b>Drug resistance / vaccine escape extension version</b></td><td>${hbvReport.extensionVersion}</td></tr>
</table>
</div>


</body>
</html>