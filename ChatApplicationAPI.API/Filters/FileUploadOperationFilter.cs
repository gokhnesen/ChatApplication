using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace ChatApplicationAPI.API
{
    public class FileUploadOperationFilter : IOperationFilter
    {
        public void Apply(OpenApiOperation operation, OperationFilterContext context)
        {
            var fileParameters = context.MethodInfo.GetParameters()
                .Where(p => p.ParameterType == typeof(IFormFile) || p.ParameterType == typeof(IFormFile[]))
                .ToList();

            if (!fileParameters.Any())
                return;

            operation.Parameters?.Clear();

            operation.RequestBody = new OpenApiRequestBody
            {
                Required = true,
                Content = new Dictionary<string, OpenApiMediaType>
                {
                    ["multipart/form-data"] = new OpenApiMediaType
                    {
                        Schema = new OpenApiSchema
                        {
                            Type = "object",
                            Properties = fileParameters.ToDictionary(
                                p => p.Name ?? "file",
                                p => new OpenApiSchema
                                {
                                    Type = "string",
                                    Format = "binary",
                                    Description = "Yüklenecek dosya"
                                }
                            ),
                            Required = fileParameters.Select(p => p.Name ?? "file").ToHashSet()
                        }
                    }
                }
            };
        }
    }
}