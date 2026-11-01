import Joi from "joi";

export class Utils {
    static generateLogId(): string {
        const randomNumber = Math.floor(Math.random() * Math.pow(10, 8))
            .toString()
            .padStart(8, '0');
        return randomNumber;
    }

    static mergeConfigSchemas(...schemas: Joi.ObjectSchema[]): Joi.ObjectSchema {
        return schemas.reduce(
            (result, schema) => result.concat(schema),
            Joi.object(),
        );
    }
}