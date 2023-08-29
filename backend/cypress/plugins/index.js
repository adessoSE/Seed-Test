// cypress/plugins/index.js
import * as webpack from "@cypress/webpack-preprocessor";

module.exports = (on, config) => {
	on('file:preprocessor', 
		webpack({
			webpackOptions: {
				resolve: {
					extensions: ['.ts', '.js']
				},
				module: {
					rules: [
						{
							test: /\.ts$/,
							exclude: [/node_modules/],
							use: [
								{
									loader: 'ts-loader'
								},
							]
						},
						{
							test: /\.feature$/,
							use: [
								{
									loader: '@badeball/cypress-cucumber-preprocessor/webpack',
									options: config
								}
							]
						}
					]
				}
			}
		})
	);
};
