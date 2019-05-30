<html>
<head>
<meta charset="UTF-8">
<style>
${getResourceAsString('hdrRasReportTransformer.css')?no_esc}
</style>
</head>
<body>

<h2>Hepatitis B virus sequence report</h2>

<#list hdrReportingResult.sequenceResults as sequenceResult>

<h4>Sequence ${sequenceResult.sequenceID}</h4>

<p>
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
<#if sequenceResult.detectedSubstitutions?size gt 0>
<table>
<tr class="tableHeader">
  <td><b>Resistant substitution</b></td>
  <td><b>Resisted drugs</b></td>
</tr>
<#list sequenceResult.detectedSubstitutions as substitution>
<tr>
<td>${substitution.virusDomain?lower_case}${substitution.substitution}</td>
<td>
<#list substitution.drug as drug>
${drug.name} (${drug.abbreviatedName})<#if !drug?is_last>,</#if>
</#list>
</td>
</tr>
</#list>
</table>
<#else>
No resistant substitutions found
</#if>
</p>

</#list>

</body>
</html>