<html>
<head>
<meta charset="UTF-8">
<style>
${getResourceAsString('hdrRasReportTransformer.css')?no_esc}
</style>
</head>
<body>

<h2>Hepatitis B virus sequence report</h2>

<table id="overview">
<colgroup>
    <col class="tableHeader"/>
    <col/>
</colgroup>

<tr><td><b>File path</b></td><td>${hdrReport.filePath}</td></tr>
<tr><td><b>Sequance data format</b></td><td>
<#if hdrReport.sequenceDataFormat = "FASTA"> 
Consensus (FASTA)
</#if>
</td></tr>
<#if hdrReport.sequenceDataFormat = "FASTA"> 
<tr>
<td><b>Sequence ID</b></td>
<td>${hdrReport.sequenceResult.id}</td>
</tr>
</#if>
<tr><td><b>Report generation date</b></td><td>${hdrReport.reportGenerationDate}</td></tr>
</table>

<#assign pubIdToIdx = {}>
<#assign pubIdToPubHash = {}>
<#assign nextPubIdx = 1>

<#assign sequenceResult = hdrReport.sequenceResult>
<p>
<h4>Sequence classification</h4>
<table>
<colgroup>
    <col class="tableHeader"/>
    <col/>
</colgroup>

<tr>
<td><b>Genotype</b></td>
<#if sequenceResult.genotypingStatus = "RESOLVED">
<td>${sequenceResult.genotype}</td>
<#else>
<td>Unknown</td>
</#if>
</tr>

<tr>
<td><b>Reverse complement?</b></td>
<#if sequenceResult.directionStatus = "RESOLVED">
<#if sequenceResult.direction = "FORWARD"><td>No</td></#if>
<#if sequenceResult.direction = "REVERSE"><td>Yes</td></#if>
<#else>
<td>Unknown</td>
</#if>
</tr>

<tr>
<td><b>Rightward nucleotide rotation</b></td>
<#if sequenceResult.rotationStatus = "RESOLVED">
<td>${sequenceResult.rotationNts?c}</td>
<#else>
<td>Unknown</td>
</#if>
</tr>
</table>
</p>

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

</body>
</html>